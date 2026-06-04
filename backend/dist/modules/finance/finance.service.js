import { FinanceRepository } from './finance.repository.js';
import { nanoid } from 'nanoid';
export class FinanceService {
    repo = new FinanceRepository();
    async createAccount(payload) {
        return this.repo.createAccount(payload);
    }
    async listAccounts() {
        return this.repo.listAccounts();
    }
    async createMethod(payload) {
        return this.repo.createMethod(payload);
    }
    async listMethods() {
        return this.repo.listMethods();
    }
    async createTransaction(input) {
        const code = `FTX-${Date.now()}-${nanoid(6)}`;
        return this.repo.createTransaction({ transactionCode: code, accountId: input.accountId, paymentMethodId: input.paymentMethodId, amount: input.amount, currency: input.currency, direction: input.direction, referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null, notes: input.notes ?? null, createdBy: input.createdBy ?? null });
    }
    async createCustomerLedger(entry) {
        return this.repo.createCustomerLedger(entry);
    }
    async createExpense(input) {
        const code = `EXP-${Date.now()}-${nanoid(5)}`;
        return this.repo.createExpense({ expenseCode: code, accountId: input.accountId ?? null, amount: input.amount, currency: input.currency, category: input.category ?? null, notes: input.notes ?? null, createdBy: input.createdBy ?? null });
    }
    async createRefund(input) {
        const code = `RFD-${Date.now()}-${nanoid(5)}`;
        return this.repo.createRefund({ refundCode: code, transactionId: input.transactionId ?? null, amount: input.amount, currency: input.currency, reason: input.reason ?? null, processedBy: input.processedBy ?? null });
    }
    async startWorkSession(payload) {
        return this.repo.startWorkSession(payload);
    }
    async closeWorkSession(id, data) {
        return this.repo.closeWorkSession(id, data);
    }
    async createDailyClosing(input) {
        return this.repo.createDailyClosing(input);
    }
}
