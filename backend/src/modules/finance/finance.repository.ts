import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

export class FinanceRepository {
  async createAccount(input: { code: string; name: string; type?: string; createdBy?: number }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_payment_accounts (code, name, type, created_by_user_id) VALUES (?, ?, ?, ?)`,[input.code, input.name, input.type ?? null, input.createdBy ?? null]);
    return { id: result.insertId, code: input.code, name: input.name } as any;
  }

  async listAccounts() {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM finance_payment_accounts ORDER BY id DESC`);
    return rows;
  }

  async createMethod(input: { code: string; name: string; provider?: string; createdBy?: number }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_payment_methods (code, name, provider, created_by_user_id) VALUES (?, ?, ?, ?)`, [input.code, input.name, input.provider ?? null, input.createdBy ?? null]);
    return { id: result.insertId, code: input.code, name: input.name } as any;
  }

  async listMethods() {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM finance_payment_methods WHERE is_active = TRUE ORDER BY id DESC`);
    return rows;
  }

  async createTransaction(input: { transactionCode: string; accountId?: number | null; paymentMethodId?: number | null; amount: number; currency: string; direction: 'in' | 'out'; referenceType?: string | null; referenceId?: number | null; notes?: string | null; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_transactions (transaction_code, account_id, payment_method_id, amount, currency, direction, reference_type, reference_id, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.transactionCode, input.accountId ?? null, input.paymentMethodId ?? null, input.amount, input.currency, input.direction, input.referenceType ?? null, input.referenceId ?? null, input.notes ?? null, input.createdBy ?? null]);
    return { id: result.insertId, transaction_code: input.transactionCode } as any;
  }

  async createCustomerLedger(entry: { customerId: number; transactionId?: number | null; change: number; balanceAfter: number; notes?: string | null; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_customer_ledger (customer_id, transaction_id, amount_change, balance_after, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`, [entry.customerId, entry.transactionId ?? null, entry.change, entry.balanceAfter, entry.notes ?? null, entry.createdBy ?? null]);
    return { id: result.insertId } as any;
  }

  async createExpense(input: { expenseCode: string; accountId?: number | null; amount: number; currency: string; category?: string | null; notes?: string | null; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_expenses (expense_code, account_id, amount, currency, category, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, [input.expenseCode, input.accountId ?? null, input.amount, input.currency, input.category ?? null, input.notes ?? null, input.createdBy ?? null]);
    return { id: result.insertId } as any;
  }

  async createRefund(input: { refundCode: string; transactionId?: number | null; amount: number; currency: string; reason?: string | null; processedBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_refunds (refund_code, transaction_id, amount, currency, reason, processed_by_user_id, processed_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [input.refundCode, input.transactionId ?? null, input.amount, input.currency, input.reason ?? null, input.processedBy ?? null]);
    return { id: result.insertId } as any;
  }

  async startWorkSession(input: { userId: number; startingBalance?: number | null; notes?: string | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_work_sessions (user_id, starting_balance, notes) VALUES (?, ?, ?)`, [input.userId, input.startingBalance ?? null, input.notes ?? null]);
    return { id: result.insertId } as any;
  }

  async closeWorkSession(id: number, data: { endingBalance?: number | null; notes?: string | null }) {
    await pool.execute(`UPDATE finance_work_sessions SET closed_at = CURRENT_TIMESTAMP, ending_balance = ?, notes = COALESCE(notes, ?) WHERE id = ?`, [data.endingBalance ?? null, data.notes ?? null, id]);
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM finance_work_sessions WHERE id = ?`, [id]);
    return rows[0];
  }

  async createDailyClosing(input: { closedAt: string; closedBy?: number | null; totals?: any }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO finance_daily_closings (closed_at, closed_by_user_id, totals) VALUES (?, ?, ?)`, [input.closedAt, input.closedBy ?? null, input.totals ? JSON.stringify(input.totals) : null]);
    return { id: result.insertId } as any;
  }
}
