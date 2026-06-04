import { FinanceRepository } from './finance.repository.js';
import { nanoid } from 'nanoid';

export class FinanceService {
  private repo = new FinanceRepository();

  async createAccount(payload: { code: string; name: string; type?: string; createdBy?: number }) {
    return this.repo.createAccount(payload);
  }

  async listAccounts() {
    return this.repo.listAccounts();
  }

  async createMethod(payload: { code: string; name: string; provider?: string; createdBy?: number }) {
    return this.repo.createMethod(payload);
  }

  async listMethods() {
    return this.repo.listMethods();
  }

  async createTransaction(input: { accountId?: number | null; paymentMethodId?: number | null; amount: number; currency: string; direction: 'in' | 'out'; referenceType?: string | null; referenceId?: number | null; notes?: string | null; createdBy?: number }) {
    const code = `FTX-${Date.now()}-${nanoid(6)}`;
    return this.repo.createTransaction({ transactionCode: code, accountId: input.accountId, paymentMethodId: input.paymentMethodId, amount: input.amount, currency: input.currency, direction: input.direction, referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null, notes: input.notes ?? null, createdBy: input.createdBy ?? null });
  }

  async createCustomerLedger(entry: { customerId: number; transactionId?: number | null; change: number; balanceAfter: number; notes?: string | null; createdBy?: number }) {
    return this.repo.createCustomerLedger(entry);
  }

  async createExpense(input: { accountId?: number | null; amount: number; currency: string; category?: string | null; notes?: string | null; createdBy?: number }) {
    const code = `EXP-${Date.now()}-${nanoid(5)}`;
    return this.repo.createExpense({ expenseCode: code, accountId: input.accountId ?? null, amount: input.amount, currency: input.currency, category: input.category ?? null, notes: input.notes ?? null, createdBy: input.createdBy ?? null });
  }

  async createRefund(input: { transactionId?: number | null; amount: number; currency: string; reason?: string | null; processedBy?: number }) {
    const code = `RFD-${Date.now()}-${nanoid(5)}`;
    return this.repo.createRefund({ refundCode: code, transactionId: input.transactionId ?? null, amount: input.amount, currency: input.currency, reason: input.reason ?? null, processedBy: input.processedBy ?? null });
  }

  async startWorkSession(payload: { userId: number; startingBalance?: number | null; notes?: string | null }) {
    return this.repo.startWorkSession(payload);
  }

  async closeWorkSession(id: number, data: { endingBalance?: number | null; notes?: string | null }) {
    return this.repo.closeWorkSession(id, data);
  }

  async createDailyClosing(input: { closedAt: string; closedBy?: number | null; totals?: any }) {
    return this.repo.createDailyClosing(input);
  }
}
