import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import { normalizeUiLanguage, type UiLanguage } from '../../shared/localization/language.js';
import type { ContactCreateInput, CustomerCreateInput, CustomerUpdateInput, LocationCreateInput } from './crm.schemas.js';

export type CustomerContactRow = RowDataPacket & {
  id: number;
  customer_id: number;
  contact_type: 'phone' | 'email' | 'whatsapp' | 'telegram' | 'other';
  contact_value: string;
  is_primary: number;
  created_at: Date;
};

export type CustomerLocationRow = RowDataPacket & {
  id: number;
  customer_id: number;
  name: string;
  location_type: 'home' | 'school' | 'company' | 'store' | 'factory' | 'hospital' | 'other';
  address_text: string | null;
  map_url: string | null;
  notes: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
};

export type CustomerNoteRow = RowDataPacket & {
  id: number;
  customer_id: number;
  note_text: string;
  created_by_user_id: number | null;
  created_at: Date;
};

export type CustomerRow = RowDataPacket & {
  id: number;
  customer_code: string;
  name: string;
  name_original?: string;
  name_source_lang?: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  avatar_url: string | null;
  customer_type: 'person' | 'business';
  notes: string | null;
  is_active: number;
  is_frozen: number;
  created_at: Date;
  updated_at: Date;
};

export type CustomerDetailRow = CustomerRow & {
  contacts: CustomerContactRow[];
  locations: CustomerLocationRow[];
  notesHistory: CustomerNoteRow[];
};

type CustomerSortMode = 'name-asc' | 'name-desc' | 'code-asc' | 'code-desc' | 'created-desc' | 'created-asc';

function mapOptional(value: string | null | undefined) {
  return value === undefined ? null : value;
}

function trimOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeContacts(input: {
  contacts?: ContactCreateInput[] | undefined;
  phonePrimary?: string | null | undefined;
  phoneSecondary?: string | null | undefined;
  email?: string | null | undefined;
}) {
  const items: ContactCreateInput[] = [];

  for (const contact of input.contacts ?? []) {
    const value = contact.contactValue.trim();
    if (!value) {
      continue;
    }

    items.push({
      contactType: contact.contactType,
      contactValue: value,
      isPrimary: Boolean(contact.isPrimary),
    });
  }

  if (trimOrNull(input.phonePrimary)) {
    items.push({
      contactType: 'phone',
      contactValue: trimOrNull(input.phonePrimary)!,
      isPrimary: true,
    });
  }

  if (trimOrNull(input.phoneSecondary)) {
    items.push({
      contactType: 'phone',
      contactValue: trimOrNull(input.phoneSecondary)!,
      isPrimary: false,
    });
  }

  if (trimOrNull(input.email)) {
    items.push({
      contactType: 'email',
      contactValue: trimOrNull(input.email)!,
      isPrimary: true,
    });
  }

  const seen = new Set<string>();
  const primaryByType = new Set<string>();
  const normalized: ContactCreateInput[] = [];

  for (const item of items) {
    const key = `${item.contactType}:${item.contactValue.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    let isPrimary = item.isPrimary;
    if (isPrimary) {
      if (primaryByType.has(item.contactType)) {
        isPrimary = false;
      } else {
        primaryByType.add(item.contactType);
      }
    }

    normalized.push({
      contactType: item.contactType,
      contactValue: item.contactValue,
      isPrimary,
    });
  }

  return normalized;
}

function deriveLegacyFields(contacts: ContactCreateInput[]) {
  const phones = contacts.filter((contact) => contact.contactType === 'phone');
  const emails = contacts.filter((contact) => contact.contactType === 'email');

  const primaryPhone = phones.find((contact) => contact.isPrimary)?.contactValue ?? phones[0]?.contactValue ?? null;
  const secondaryPhone = phones.find((contact) => contact.contactValue !== primaryPhone)?.contactValue ?? null;
  const primaryEmail = emails.find((contact) => contact.isPrimary)?.contactValue ?? emails[0]?.contactValue ?? null;

  return {
    phonePrimary: primaryPhone,
    phoneSecondary: secondaryPhone,
    email: primaryEmail,
  };
}

function buildCustomerSearchFilter(search?: string) {
  const trimmedSearch = search?.trim();
  const values: string[] = [];
  let where = 'WHERE c.is_active = TRUE';

  if (trimmedSearch) {
    where += ` AND (
      c.name LIKE ?
      OR c.phone_primary LIKE ?
      OR c.phone_secondary LIKE ?
      OR c.customer_code LIKE ?
      OR EXISTS (
        SELECT 1
        FROM entity_translations et
        WHERE et.entity_type = 'crm_customers'
          AND et.entity_id = c.id
          AND et.field_name = 'name'
          AND et.text_value LIKE ?
      )
    )`;
    const like = `%${trimmedSearch}%`;
    values.push(like, like, like, like, like);
  }

  return { where, values };
}

function buildCustomerOrderBy(sort?: CustomerSortMode) {
  switch (sort) {
    case 'name-asc':
      return 'ORDER BY name ASC, c.id DESC';
    case 'name-desc':
      return 'ORDER BY name DESC, c.id DESC';
    case 'code-asc':
      return 'ORDER BY c.customer_code ASC, c.id DESC';
    case 'code-desc':
      return 'ORDER BY c.customer_code DESC, c.id DESC';
    case 'created-asc':
      return 'ORDER BY c.created_at ASC, c.id ASC';
    case 'created-desc':
    default:
      return 'ORDER BY c.created_at DESC, c.id DESC';
  }
}

export class CrmRepository {
  async listCustomers(params: { search?: string; language?: UiLanguage; offset: number; limit: number; sort?: CustomerSortMode }) {
    const language = normalizeUiLanguage(params.language);
    const { where, values } = buildCustomerSearchFilter(params.search);
    const orderBy = buildCustomerOrderBy(params.sort);
    const limit = Math.max(1, Math.floor(params.limit));
    const offset = Math.max(0, Math.floor(params.offset));

    const [rows] = await pool.execute<CustomerRow[]>(
      `SELECT
         c.id,
         c.customer_code,
         COALESCE(c_name_loc.text_value, c.name) AS name,
         c.name AS name_original,
         COALESCE(c_name_loc.source_lang_code, NULL) AS name_source_lang,
         c.phone_primary,
         c.phone_secondary,
         c.email,
         CASE
           WHEN c.avatar_url LIKE 'data:image/%' THEN NULL
           WHEN CHAR_LENGTH(COALESCE(c.avatar_url, '')) > 2048 THEN NULL
           ELSE c.avatar_url
         END AS avatar_url,
         c.customer_type,
         c.notes,
         c.is_active,
         c.is_frozen,
         c.created_at,
         c.updated_at
       FROM crm_customers c
       LEFT JOIN entity_translations c_name_loc
         ON c_name_loc.entity_type = 'crm_customers'
         AND c_name_loc.entity_id = c.id
         AND c_name_loc.field_name = 'name'
         AND c_name_loc.lang_code = ?
       ${where}
       ${orderBy}
       LIMIT ${limit}
       OFFSET ${offset}`,
      [language, ...values],
    );
    return rows;
  }

  async countCustomers(params: { search?: string }) {
    const { where, values } = buildCustomerSearchFilter(params.search);

    const [rows] = await pool.execute<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total
       FROM crm_customers c
       ${where}`,
      values,
    );

    return Number(rows[0]?.total ?? 0);
  }

  async findCustomerById(id: number, language?: UiLanguage) {
    const resolvedLanguage = normalizeUiLanguage(language);
    const [rows] = await pool.execute<CustomerRow[]>(
      `SELECT
         c.*,
         COALESCE(c_name_loc.text_value, c.name) AS name,
         c.name AS name_original,
         COALESCE(c_name_loc.source_lang_code, NULL) AS name_source_lang
       FROM crm_customers c
       LEFT JOIN entity_translations c_name_loc
         ON c_name_loc.entity_type = 'crm_customers'
         AND c_name_loc.entity_id = c.id
         AND c_name_loc.field_name = 'name'
         AND c_name_loc.lang_code = ?
       WHERE c.id = ?
       LIMIT 1`,
      [resolvedLanguage, id],
    );
    return rows[0] ?? null;
  }

  async findCustomerDetailById(id: number, language?: UiLanguage): Promise<CustomerDetailRow | null> {
    const customer = await this.findCustomerById(id, language);
    if (!customer) {
      return null;
    }

    const [contacts, locations, notesHistory] = await Promise.all([
      this.listContactsByCustomerId(id),
      this.listLocationsByCustomerId(id),
      this.listNotesByCustomerId(id),
    ]);

    return {
      ...customer,
      contacts,
      locations,
      notesHistory,
    };
  }

  async createCustomer(input: CustomerCreateInput, userId: number, language?: UiLanguage) {
    const contacts = normalizeContacts(input);
    const derived = deriveLegacyFields(contacts);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO crm_customers (
         customer_code, name, phone_primary, phone_secondary, email, avatar_url, customer_type, notes, is_frozen, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        await this.nextCustomerCode(),
        input.name,
        mapOptional(derived.phonePrimary),
        mapOptional(derived.phoneSecondary),
        mapOptional(derived.email),
        mapOptional(input.avatarUrl),
        input.customerType,
        mapOptional(input.notes),
        Boolean(input.isFrozen),
        userId,
      ],
    );

    if (contacts.length > 0) {
      await this.replaceContacts(result.insertId, contacts);
    }

    return this.findCustomerDetailById(result.insertId, language);
  }

  async updateCustomer(id: number, input: CustomerUpdateInput, userId: number, language?: UiLanguage) {
    const existing = await this.findCustomerDetailById(id, language);
    if (!existing) {
      return null;
    }

    const nextContacts =
      input.contacts !== undefined
        ? normalizeContacts({
            contacts: input.contacts,
            phonePrimary: input.phonePrimary,
            phoneSecondary: input.phoneSecondary,
            email: input.email,
          })
        : existing.contacts.map((contact) => ({
            contactType: contact.contact_type,
            contactValue: contact.contact_value,
            isPrimary: Boolean(contact.is_primary),
          }));

    const derived = deriveLegacyFields(nextContacts);

    await pool.execute(
      `UPDATE crm_customers
       SET name = ?,
           phone_primary = ?,
           phone_secondary = ?,
           email = ?,
           avatar_url = ?,
           customer_type = ?,
           notes = ?,
           is_frozen = ?,
           updated_by_user_id = ?
       WHERE id = ?`,
      [
        input.name ?? existing.name,
        input.contacts !== undefined || input.phonePrimary !== undefined ? mapOptional(derived.phonePrimary) : existing.phone_primary,
        input.contacts !== undefined || input.phoneSecondary !== undefined ? mapOptional(derived.phoneSecondary) : existing.phone_secondary,
        input.contacts !== undefined || input.email !== undefined ? mapOptional(derived.email) : existing.email,
        input.avatarUrl !== undefined ? mapOptional(input.avatarUrl) : existing.avatar_url,
        input.customerType ?? existing.customer_type,
        input.notes !== undefined ? mapOptional(input.notes) : existing.notes,
        input.isFrozen !== undefined ? Boolean(input.isFrozen) : Boolean(existing.is_frozen),
        userId,
        id,
      ],
    );

    if (input.contacts !== undefined) {
      await this.replaceContacts(id, nextContacts);
    }

    return this.findCustomerDetailById(id, language);
  }

  async softDeleteCustomer(id: number, userId: number) {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE crm_customers
       SET is_active = FALSE, updated_by_user_id = ?
       WHERE id = ? AND is_active = TRUE`,
      [userId, id],
    );

    return result.affectedRows > 0;
  }

  async createContact(customerId: number, input: ContactCreateInput) {
    if (input.isPrimary) {
      await pool.execute(
        `UPDATE crm_customer_contacts
         SET is_primary = FALSE
         WHERE customer_id = ? AND contact_type = ?`,
        [customerId, input.contactType],
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO crm_customer_contacts (customer_id, contact_type, contact_value, is_primary)
       VALUES (?, ?, ?, ?)`,
      [customerId, input.contactType, input.contactValue, input.isPrimary],
    );
    return { id: result.insertId, customerId, ...input };
  }

  async createLocation(customerId: number, input: LocationCreateInput) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO crm_locations (customer_id, name, location_type, address_text, map_url, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customerId, input.name, input.locationType, mapOptional(input.addressText), mapOptional(input.mapUrl), mapOptional(input.notes)],
    );
    return { id: result.insertId, customerId, ...input };
  }

  async createNote(customerId: number, noteText: string, userId: number) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO crm_customer_notes (customer_id, note_text, created_by_user_id)
       VALUES (?, ?, ?)`,
      [customerId, noteText, userId],
    );
    return { id: result.insertId, customerId, noteText };
  }

  private async listContactsByCustomerId(customerId: number) {
    const [rows] = await pool.execute<CustomerContactRow[]>(
      `SELECT *
       FROM crm_customer_contacts
       WHERE customer_id = ?
       ORDER BY is_primary DESC, created_at ASC, id ASC`,
      [customerId],
    );

    return rows;
  }

  private async listLocationsByCustomerId(customerId: number) {
    const [rows] = await pool.execute<CustomerLocationRow[]>(
      `SELECT *
       FROM crm_locations
       WHERE customer_id = ? AND is_active = TRUE
       ORDER BY created_at DESC, id DESC`,
      [customerId],
    );

    return rows;
  }

  private async listNotesByCustomerId(customerId: number) {
    const [rows] = await pool.execute<CustomerNoteRow[]>(
      `SELECT id, customer_id, note_text, created_by_user_id, created_at
       FROM crm_customer_notes
       WHERE customer_id = ?
       ORDER BY created_at DESC, id DESC`,
      [customerId],
    );

    return rows;
  }

  private async replaceContacts(customerId: number, contacts: ContactCreateInput[]) {
    await pool.execute('DELETE FROM crm_customer_contacts WHERE customer_id = ?', [customerId]);

    for (const contact of contacts) {
      await pool.execute(
        `INSERT INTO crm_customer_contacts (customer_id, contact_type, contact_value, is_primary)
         VALUES (?, ?, ?, ?)`,
        [customerId, contact.contactType, contact.contactValue, contact.isPrimary],
      );
    }
  }

  private async nextCustomerCode() {
    const [rows] = await pool.query<Array<RowDataPacket & { next_id: number }>>(
      'SELECT AUTO_INCREMENT AS next_id FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "crm_customers"',
    );
    const nextId = rows[0]?.next_id ?? Date.now();
    return `CUS-${String(nextId).padStart(6, '0')}`;
  }
}
