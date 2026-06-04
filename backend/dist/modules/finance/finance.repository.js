import { pool } from '../../database/mysql.js';
export class FinanceRepository {
    async createAccount(input) {
        const [result] = await pool.execute(`INSERT INTO finance_payment_accounts (code, name, type, created_by_user_id) VALUES (?, ?, ?, ?)`, [input.code, input.name, input.type ?? null, input.createdBy ?? null]);
        return { id: result.insertId, code: input.code, name: input.name };
    }
    async listAccounts() {
        const [rows] = await pool.execute(`SELECT * FROM finance_payment_accounts ORDER BY id DESC`);
        return rows;
    }
    async createMethod(input) {
        const [result] = await pool.execute(`INSERT INTO finance_payment_methods (code, name, provider, created_by_user_id) VALUES (?, ?, ?, ?)`, [input.code, input.name, input.provider ?? null, input.createdBy ?? null]);
        return { id: result.insertId, code: input.code, name: input.name };
    }
    async listMethods() {
        const [rows] = await pool.execute(`SELECT * FROM finance_payment_methods WHERE is_active = TRUE ORDER BY id DESC`);
        return rows;
    }
    async createTransaction(input) {
        const [result] = await pool.execute(`INSERT INTO finance_transactions (transaction_code, account_id, payment_method_id, amount, currency, direction, reference_type, reference_id, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.transactionCode, input.accountId ?? null, input.paymentMethodId ?? null, input.amount, input.currency, input.direction, input.referenceType ?? null, input.referenceId ?? null, input.notes ?? null, input.createdBy ?? null]);
        return { id: result.insertId, transaction_code: input.transactionCode };
    }
    async createCustomerLedger(entry) {
        const [result] = await pool.execute(`INSERT INTO finance_customer_ledger (customer_id, transaction_id, amount_change, balance_after, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`, [entry.customerId, entry.transactionId ?? null, entry.change, entry.balanceAfter, entry.notes ?? null, entry.createdBy ?? null]);
        return { id: result.insertId };
    }
    async createExpense(input) {
        const [result] = await pool.execute(`INSERT INTO finance_expenses (expense_code, account_id, amount, currency, category, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, [input.expenseCode, input.accountId ?? null, input.amount, input.currency, input.category ?? null, input.notes ?? null, input.createdBy ?? null]);
        return { id: result.insertId };
    }
    async createRefund(input) {
        const [result] = await pool.execute(`INSERT INTO finance_refunds (refund_code, transaction_id, amount, currency, reason, processed_by_user_id, processed_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [input.refundCode, input.transactionId ?? null, input.amount, input.currency, input.reason ?? null, input.processedBy ?? null]);
        return { id: result.insertId };
    }
    async startWorkSession(input) {
        const [result] = await pool.execute(`INSERT INTO finance_work_sessions (user_id, starting_balance, notes) VALUES (?, ?, ?)`, [input.userId, input.startingBalance ?? null, input.notes ?? null]);
        return { id: result.insertId };
    }
    async closeWorkSession(id, data) {
        await pool.execute(`UPDATE finance_work_sessions SET closed_at = CURRENT_TIMESTAMP, ending_balance = ?, notes = COALESCE(notes, ?) WHERE id = ?`, [data.endingBalance ?? null, data.notes ?? null, id]);
        const [rows] = await pool.execute(`SELECT * FROM finance_work_sessions WHERE id = ?`, [id]);
        return rows[0];
    }
    async createDailyClosing(input) {
        const [result] = await pool.execute(`INSERT INTO finance_daily_closings (closed_at, closed_by_user_id, totals) VALUES (?, ?, ?)`, [input.closedAt, input.closedBy ?? null, input.totals ? JSON.stringify(input.totals) : null]);
        return { id: result.insertId };
    }
}
