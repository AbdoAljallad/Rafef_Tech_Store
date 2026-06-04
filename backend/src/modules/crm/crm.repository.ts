import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import type { ContactCreateInput, CustomerCreateInput, CustomerUpdateInput, LocationCreateInput } from './crm.schemas.js';

export type CustomerRow = RowDataPacket & {
  id: number;
  customer_code: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  customer_type: 'person' | 'business';
  notes: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
};

function mapOptional(value: string | null | undefined) {
  return value === undefined ? null : value;
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

  async findCustomerById(id: number) {
    const [rows] = await pool.execute<CustomerRow[]>('SELECT * FROM crm_customers WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  }

  async createCustomer(input: CustomerCreateInput, userId: number) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO crm_customers (
         customer_code, name, phone_primary, phone_secondary, email, customer_type, notes, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        await this.nextCustomerCode(),
        input.name,
        mapOptional(input.phonePrimary),
        mapOptional(input.phoneSecondary),
        mapOptional(input.email),
        input.customerType,
        mapOptional(input.notes),
        userId,
      ],
    );
    return this.findCustomerById(result.insertId);
  }

  async updateCustomer(id: number, input: CustomerUpdateInput, userId: number) {
    const existing = await this.findCustomerById(id);
    if (!existing) return null;

    await pool.execute(
      `UPDATE crm_customers
       SET name = COALESCE(?, name),
           phone_primary = COALESCE(?, phone_primary),
           phone_secondary = COALESCE(?, phone_secondary),
           email = COALESCE(?, email),
           customer_type = COALESCE(?, customer_type),
           notes = COALESCE(?, notes),
           updated_by_user_id = ?
       WHERE id = ?`,
      [
        input.name ?? null,
        input.phonePrimary ?? null,
        input.phoneSecondary ?? null,
        input.email ?? null,
        input.customerType ?? null,
        input.notes ?? null,
        userId,
        id,
      ],
    );
    return this.findCustomerById(id);
  }

  async createContact(customerId: number, input: ContactCreateInput) {
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

  private async nextCustomerCode() {
    const [rows] = await pool.query<Array<RowDataPacket & { next_id: number }>>(
      'SELECT AUTO_INCREMENT AS next_id FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "crm_customers"',
    );
    const nextId = rows[0]?.next_id ?? Date.now();
    return `CUS-${String(nextId).padStart(6, '0')}`;
  }
}
