import { httpClient } from '../../../shared/api/httpClient';
import type {
  FinanceAccount,
  FinanceAccountCreatePayload,
  FinanceDashboard,
  FinanceMethod,
  FinanceMethodCreatePayload,
  FinanceProvider,
  FinanceTransaction,
  FinanceTransactionCreatePayload,
} from '../types/finance.types';

const financeApi = {
  getDashboard() {
    return httpClient.get<FinanceDashboard>('/api/finance/dashboard');
  },
  listProviders(params?: { providerType?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.providerType) {
      query.set('providerType', params.providerType);
    }
    if (params?.search?.trim()) {
      query.set('search', params.search.trim());
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return httpClient.get<{ items: FinanceProvider[] }>(`/api/finance/providers${suffix}`);
  },
  listAccounts() {
    return httpClient.get<{ items: FinanceAccount[] }>('/api/finance/accounts');
  },
  createAccount(payload: FinanceAccountCreatePayload) {
    return httpClient.post<{ account: FinanceAccount }>('/api/finance/accounts', payload);
  },
  listMethods() {
    return httpClient.get<{ items: FinanceMethod[] }>('/api/finance/payment-methods');
  },
  createMethod(payload: FinanceMethodCreatePayload) {
    return httpClient.post<{ method: FinanceMethod }>('/api/finance/payment-methods', payload);
  },
  listTransactions(limit = 30) {
    return httpClient.get<{ items: FinanceTransaction[] }>(`/api/finance/transactions?limit=${limit}`);
  },
  createTransaction(payload: FinanceTransactionCreatePayload) {
    return httpClient.post<{ transaction: FinanceTransaction }>('/api/finance/transactions', payload);
  },
  createLedgerEntry(customerId: number, payload: any) {
    return httpClient.post<{ entry: any }>(`/api/finance/customers/${customerId}/ledger`, payload);
  },
  createExpense(payload: any) {
    return httpClient.post<{ expense: any }>('/api/finance/expenses', payload);
  },
  createRefund(payload: any) {
    return httpClient.post<{ refund: any }>('/api/finance/refunds', payload);
  },
  startWorkSession(payload: any) {
    return httpClient.post<{ session: any }>('/api/finance/work-sessions', payload);
  },
  closeWorkSession(id: number, payload: any) {
    return httpClient.post<{ session: any }>(`/api/finance/work-sessions/${id}/close`, payload);
  },
  createDailyClosing(payload: any) {
    return httpClient.post<{ closing: any }>('/api/finance/daily-closings', payload);
  },
};

export default financeApi;
