import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

export class SalesRepository {
  async createInvoice(input: { customerId?: number | null; isWalkIn?: boolean; createdBy: number }) {
    const code = `SINV-${Date.now()}`;
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sales_invoices (invoice_code, customer_id, is_walk_in, created_by_user_id)
       VALUES (?, ?, ?, ?)`,
      [code, input.customerId ?? null, !!input.isWalkIn, input.createdBy],
    );
    return { id: result.insertId, invoice_code: code } as any;
  }

  async addLine(invoiceId: number, line: { productId: number; quantity: number; unitPrice: number; unitCost?: number | null }) {
    const lineTotal = Number((line.quantity * line.unitPrice).toFixed(2));
    await pool.execute<ResultSetHeader>(
      `INSERT INTO sales_invoice_lines (invoice_id, product_id, quantity, unit_price, unit_cost, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoiceId, line.productId, line.quantity, line.unitPrice, line.unitCost ?? null, lineTotal],
    );
    return this.getInvoiceById(invoiceId);
  }

  async getInvoiceById(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM sales_invoices WHERE id = ?`, [id]);
    const invoice = rows[0];
    if (!invoice) return null;
    const [lines] = await pool.execute<RowDataPacket[]>(`SELECT * FROM sales_invoice_lines WHERE invoice_id = ? ORDER BY id`, [id]);
    return { ...invoice, lines };
  }

  async listInvoices(params: { offset?: number; limit?: number } = {}) {
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM sales_invoices ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
    return rows;
  }

  async markApproved(id: number, approverId: number) {
    await pool.execute(`UPDATE sales_invoices SET status = 'approved', approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`, [approverId, id]);
    return this.getInvoiceById(id);
  }

  async markVoided(id: number, voiderId: number) {
    await pool.execute(`UPDATE sales_invoices SET status = 'voided', voided_by_user_id = ?, voided_at = CURRENT_TIMESTAMP WHERE id = ?`, [voiderId, id]);
    return this.getInvoiceById(id);
  }

  async createReturn(payload: { invoiceId: number; createdBy: number }) {
    const code = `SRET-${Date.now()}`;
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO sales_returns (return_code, invoice_id, created_by_user_id) VALUES (?, ?, ?)`, [code, payload.invoiceId, payload.createdBy]);
    return { id: result.insertId, return_code: code } as any;
  }

  async addReturnLine(returnId: number, line: { productId: number; quantity: number; unitPrice?: number; unitCost?: number }) {
    const lineTotal = line.unitPrice ? Number((line.quantity * line.unitPrice).toFixed(2)) : null;
    await pool.execute(`INSERT INTO sales_return_lines (return_id, product_id, quantity, unit_price, unit_cost, line_total) VALUES (?, ?, ?, ?, ?, ?)`, [returnId, line.productId, line.quantity, line.unitPrice ?? null, line.unitCost ?? null, lineTotal]);
    return this.getReturnById(returnId);
  }

  async getReturnById(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM sales_returns WHERE id = ?`, [id]);
    const ret = rows[0];
    if (!ret) return null;
    const [lines] = await pool.execute<RowDataPacket[]>(`SELECT * FROM sales_return_lines WHERE return_id = ? ORDER BY id`, [id]);
    return { ...ret, lines };
  }
}
