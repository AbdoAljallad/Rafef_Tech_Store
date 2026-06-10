import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

type FinanceAccountRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  type: string;
  provider: string | null;
  currency: string;
  account_number: string | null;
  opening_balance: string;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  incoming_total: string;
  outgoing_total: string;
  transaction_count: number;
  expense_total: string;
  expense_count: number;
  refund_total: string;
  refund_count: number;
  current_balance: string;
};

type FinanceMethodRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  method_type: string;
  provider: string | null;
  linked_account_id: number | null;
  linked_account_code: string | null;
  linked_account_name: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

type FinanceTransactionRow = RowDataPacket & {
  id: number;
  transaction_code: string;
  account_id: number | null;
  payment_method_id: number | null;
  amount: string;
  currency: string;
  direction: 'in' | 'out';
  operation_type: string;
  reference_type: string | null;
  reference_id: number | null;
  counterparty_name: string | null;
  external_reference: string | null;
  notes: string | null;
  created_at: string;
  account_code: string | null;
  account_name: string | null;
  method_code: string | null;
  method_name: string | null;
};

function numeric(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

const accountProjection = `
  SELECT
    a.id,
    a.code,
    a.name,
    a.type,
    a.provider,
    a.currency,
    a.account_number,
    a.opening_balance,
    a.is_active,
    a.notes,
    a.created_at,
    a.updated_at,
    COALESCE(tx.incoming_total, 0) AS incoming_total,
    COALESCE(tx.outgoing_total, 0) AS outgoing_total,
    COALESCE(tx.transaction_count, 0) AS transaction_count,
    COALESCE(exp.expense_total, 0) AS expense_total,
    COALESCE(exp.expense_count, 0) AS expense_count,
    COALESCE(ref.refund_total, 0) AS refund_total,
    COALESCE(ref.refund_count, 0) AS refund_count,
    CAST(
      COALESCE(a.opening_balance, 0)
      + COALESCE(tx.incoming_total, 0)
      - COALESCE(tx.outgoing_total, 0)
      - COALESCE(exp.expense_total, 0)
      - COALESCE(ref.refund_total, 0)
      AS DECIMAL(19,4)
    ) AS current_balance
  FROM finance_payment_accounts a
  LEFT JOIN (
    SELECT
      account_id,
      SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) AS incoming_total,
      SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) AS outgoing_total,
      COUNT(*) AS transaction_count
    FROM finance_transactions
    WHERE account_id IS NOT NULL
    GROUP BY account_id
  ) tx ON tx.account_id = a.id
  LEFT JOIN (
    SELECT
      account_id,
      SUM(amount) AS expense_total,
      COUNT(*) AS expense_count
    FROM finance_expenses
    WHERE account_id IS NOT NULL
    GROUP BY account_id
  ) exp ON exp.account_id = a.id
  LEFT JOIN (
    SELECT
      t.account_id,
      SUM(r.amount) AS refund_total,
      COUNT(*) AS refund_count
    FROM finance_refunds r
    INNER JOIN finance_transactions t ON t.id = r.transaction_id
    WHERE t.account_id IS NOT NULL
    GROUP BY t.account_id
  ) ref ON ref.account_id = a.id
`;

export class FinanceRepository {
  async createAccount(input: {
    code: string;
    name: string;
    type: string;
    provider?: string | null;
    currency: string;
    accountNumber?: string | null;
    openingBalance?: number;
    notes?: string | null;
    isActive?: boolean;
    createdBy?: number;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_payment_accounts (
         code,
         name,
         type,
         provider,
         currency,
         account_number,
         opening_balance,
         is_active,
         notes,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code,
        input.name,
        input.type,
        input.provider ?? null,
        input.currency,
        input.accountNumber ?? null,
        input.openingBalance ?? 0,
        input.isActive ?? true,
        input.notes ?? null,
        input.createdBy ?? null,
      ],
    );

    return this.findAccountById(result.insertId);
  }

  async listAccounts() {
    const [rows] = await pool.query<FinanceAccountRow[]>(
      `${accountProjection}
       ORDER BY a.is_active DESC, a.type ASC, a.name ASC, a.id DESC`,
    );
    return rows;
  }

  async findAccountById(id: number) {
    const [rows] = await pool.execute<FinanceAccountRow[]>(
      `${accountProjection}
       WHERE a.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createMethod(input: {
    code: string;
    name: string;
    methodType: string;
    provider?: string | null;
    linkedAccountId?: number | null;
    notes?: string | null;
    createdBy?: number;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_payment_methods (
         code,
         name,
         method_type,
         provider,
         linked_account_id,
         notes,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code,
        input.name,
        input.methodType,
        input.provider ?? null,
        input.linkedAccountId ?? null,
        input.notes ?? null,
        input.createdBy ?? null,
      ],
    );

    return this.findMethodById(result.insertId);
  }

  async listMethods() {
    const [rows] = await pool.query<FinanceMethodRow[]>(
      `SELECT
         m.id,
         m.code,
         m.name,
         m.method_type,
         m.provider,
         m.linked_account_id,
         a.code AS linked_account_code,
         a.name AS linked_account_name,
         m.notes,
         m.is_active,
         m.created_at
       FROM finance_payment_methods m
       LEFT JOIN finance_payment_accounts a ON a.id = m.linked_account_id
       WHERE m.is_active = TRUE
       ORDER BY m.method_type ASC, m.name ASC, m.id DESC`,
    );
    return rows;
  }

  async findMethodById(id: number) {
    const [rows] = await pool.execute<FinanceMethodRow[]>(
      `SELECT
         m.id,
         m.code,
         m.name,
         m.method_type,
         m.provider,
         m.linked_account_id,
         a.code AS linked_account_code,
         a.name AS linked_account_name,
         m.notes,
         m.is_active,
         m.created_at
       FROM finance_payment_methods m
       LEFT JOIN finance_payment_accounts a ON a.id = m.linked_account_id
       WHERE m.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createTransaction(input: {
    transactionCode: string;
    accountId?: number | null;
    paymentMethodId?: number | null;
    amount: number;
    currency: string;
    direction: 'in' | 'out';
    operationType: string;
    referenceType?: string | null;
    referenceId?: number | null;
    counterpartyName?: string | null;
    externalReference?: string | null;
    notes?: string | null;
    createdBy?: number | null;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_transactions (
         transaction_code,
         account_id,
         payment_method_id,
         amount,
         currency,
         direction,
         operation_type,
         reference_type,
         reference_id,
         counterparty_name,
         external_reference,
         notes,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.transactionCode,
        input.accountId ?? null,
        input.paymentMethodId ?? null,
        input.amount,
        input.currency,
        input.direction,
        input.operationType,
        input.referenceType ?? null,
        input.referenceId ?? null,
        input.counterpartyName ?? null,
        input.externalReference ?? null,
        input.notes ?? null,
        input.createdBy ?? null,
      ],
    );
    return this.findTransactionById(result.insertId);
  }

  async listTransactions(params: { limit?: number } = {}) {
    const limit = params.limit ?? 30;
    const [rows] = await pool.execute<FinanceTransactionRow[]>(
      `SELECT
         t.id,
         t.transaction_code,
         t.account_id,
         t.payment_method_id,
         t.amount,
         t.currency,
         t.direction,
         t.operation_type,
         t.reference_type,
         t.reference_id,
         t.counterparty_name,
         t.external_reference,
         t.notes,
         t.created_at,
         a.code AS account_code,
         a.name AS account_name,
         m.code AS method_code,
         m.name AS method_name
       FROM finance_transactions t
       LEFT JOIN finance_payment_accounts a ON a.id = t.account_id
       LEFT JOIN finance_payment_methods m ON m.id = t.payment_method_id
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ?`,
      [limit],
    );
    return rows;
  }

  async findTransactionById(id: number) {
    const [rows] = await pool.execute<FinanceTransactionRow[]>(
      `SELECT
         t.id,
         t.transaction_code,
         t.account_id,
         t.payment_method_id,
         t.amount,
         t.currency,
         t.direction,
         t.operation_type,
         t.reference_type,
         t.reference_id,
         t.counterparty_name,
         t.external_reference,
         t.notes,
         t.created_at,
         a.code AS account_code,
         a.name AS account_name,
         m.code AS method_code,
         m.name AS method_name
       FROM finance_transactions t
       LEFT JOIN finance_payment_accounts a ON a.id = t.account_id
       LEFT JOIN finance_payment_methods m ON m.id = t.payment_method_id
       WHERE t.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createCustomerLedger(entry: {
    customerId: number;
    transactionId?: number | null;
    change: number;
    balanceAfter: number;
    notes?: string | null;
    createdBy?: number | null;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_customer_ledger (
         customer_id,
         transaction_id,
         amount_change,
         balance_after,
         notes,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.customerId,
        entry.transactionId ?? null,
        entry.change,
        entry.balanceAfter,
        entry.notes ?? null,
        entry.createdBy ?? null,
      ],
    );
    return { id: result.insertId };
  }

  async createExpense(input: {
    expenseCode: string;
    accountId?: number | null;
    amount: number;
    currency: string;
    category?: string | null;
    notes?: string | null;
    createdBy?: number | null;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_expenses (
         expense_code,
         account_id,
         amount,
         currency,
         category,
         notes,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.expenseCode,
        input.accountId ?? null,
        input.amount,
        input.currency,
        input.category ?? null,
        input.notes ?? null,
        input.createdBy ?? null,
      ],
    );
    return { id: result.insertId };
  }

  async createRefund(input: {
    refundCode: string;
    transactionId?: number | null;
    amount: number;
    currency: string;
    reason?: string | null;
    processedBy?: number | null;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_refunds (
         refund_code,
         transaction_id,
         amount,
         currency,
         reason,
         processed_by_user_id,
         processed_at
       )
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        input.refundCode,
        input.transactionId ?? null,
        input.amount,
        input.currency,
        input.reason ?? null,
        input.processedBy ?? null,
      ],
    );
    return { id: result.insertId };
  }

  async startWorkSession(input: { userId: number; startingBalance?: number | null; notes?: string | null }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_work_sessions (user_id, starting_balance, notes) VALUES (?, ?, ?)`,
      [input.userId, input.startingBalance ?? null, input.notes ?? null],
    );
    return { id: result.insertId };
  }

  async closeWorkSession(id: number, data: { endingBalance?: number | null; notes?: string | null }) {
    await pool.execute(
      `UPDATE finance_work_sessions
       SET closed_at = CURRENT_TIMESTAMP, ending_balance = ?, notes = COALESCE(notes, ?)
       WHERE id = ?`,
      [data.endingBalance ?? null, data.notes ?? null, id],
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM finance_work_sessions WHERE id = ?`,
      [id],
    );
    return rows[0];
  }

  async createDailyClosing(input: { closedAt: string; closedBy?: number | null; totals?: any }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO finance_daily_closings (closed_at, closed_by_user_id, totals) VALUES (?, ?, ?)`,
      [input.closedAt, input.closedBy ?? null, input.totals ? JSON.stringify(input.totals) : null],
    );
    return { id: result.insertId };
  }

  async getDashboard() {
    const [accounts, methods, recentTransactions] = await Promise.all([
      this.listAccounts(),
      this.listMethods(),
      this.listTransactions({ limit: 10 }),
    ]);

    const summary = accounts.reduce(
      (accumulator, account) => {
        const balance = numeric(account.current_balance);
        const incoming = numeric(account.incoming_total);
        const outgoing = numeric(account.outgoing_total);
        const expenses = numeric(account.expense_total);
        const refunds = numeric(account.refund_total);
        const accountType = String(account.type);
        const isActive = Number(account.is_active ?? 0) === 1;
        const isMachine = ['pos_terminal', 'instant_payment_machine', 'service_machine'].includes(accountType);

        accumulator.totalBalance += balance;
        accumulator.incomingTotal += incoming;
        accumulator.outgoingTotal += outgoing;
        accumulator.expenseTotal += expenses;
        accumulator.refundTotal += refunds;

        if (isActive) {
          accumulator.activeAccounts += 1;
        }

        if (accountType === 'cash_drawer' || accountType === 'branch_safe') {
          accumulator.cashBalance += balance;
        }
        if (accountType === 'bank_account') {
          accumulator.bankBalance += balance;
          accumulator.bankAccounts += 1;
        }
        if (accountType === 'e_wallet') {
          accumulator.walletBalance += balance;
          accumulator.walletAccounts += 1;
        }
        if (isMachine) {
          accumulator.machineBalance += balance;
          accumulator.machineAccounts += 1;
        }

        return accumulator;
      },
      {
        totalBalance: 0,
        incomingTotal: 0,
        outgoingTotal: 0,
        expenseTotal: 0,
        refundTotal: 0,
        cashBalance: 0,
        bankBalance: 0,
        walletBalance: 0,
        machineBalance: 0,
        activeAccounts: 0,
        bankAccounts: 0,
        walletAccounts: 0,
        machineAccounts: 0,
      },
    );

    return {
      summary: {
        ...summary,
        paymentMethods: methods.length,
        accountCount: accounts.length,
        netFlow: summary.incomingTotal - summary.outgoingTotal - summary.expenseTotal - summary.refundTotal,
      },
      accounts,
      methods,
      recentTransactions,
    };
  }
}
