import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
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

export class CrmRepository {
  async listCustomers(params: { search?: string; offset: number; limit: number }) {
    const search = params.search?.trim();
    const values: Array<string | number> = [];
    let where = 'WHERE c.is_active = TRUE';

    if (search) {
      where += ' AND (c.name LIKE ? OR c.phone_primary LIKE ? OR c.phone_secondary LIKE ? OR c.customer_code LIKE ?)';
      const like = `%${search}%`;
      values.push(like, like, like, like);
    }

    const [rows] = await pool.execute<CustomerRow[]>(
      `SELECT c.*
       FROM crm_customers c
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ${params.limit} OFFSET ${params.offset}`,
      values,
    );
    return rows;
  }

  async countCustomers(params: { search?: string }) {
    const search = params.search?.trim();
    const values: Array<string | number> = [];
    let where = 'WHERE c.is_active = TRUE';

    if (search) {
      where += ' AND (c.name LIKE ? OR c.phone_primary LIKE ? OR c.phone_secondary LIKE ? OR c.customer_code LIKE ?)';
      const like = `%${search}%`;
      values.push(like, like, like, like);
    }

    const [rows] = await pool.execute<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total
       FROM crm_customers c
       ${where}`,
      values,
    );

    return Number(rows[0]?.total ?? 0);
  }

  async findCustomerById(id: number) {
    const [rows] = await pool.execute<CustomerRow[]>('SELECT * FROM crm_customers WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  }

  async findCustomerDetailById(id: number): Promise<CustomerDetailRow | null> {
    const customer = await this.findCustomerById(id);
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

  async createCustomer(input: CustomerCreateInput, userId: number) {
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

    return this.findCustomerDetailById(result.insertId);
  }

  async updateCustomer(id: number, input: CustomerUpdateInput, userId: number) {
    const existing = await this.findCustomerDetailById(id);
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

    return this.findCustomerDetailById(id);
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
