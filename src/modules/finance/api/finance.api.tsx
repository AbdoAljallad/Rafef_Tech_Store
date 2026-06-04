const BASE = '/api';

export const financeApi = {
  listAccounts: async () => fetch(`${BASE}/finance/accounts`, { credentials: 'include' }).then((r) => r.json()),
  createAccount: async (payload: any) => fetch(`${BASE}/finance/accounts`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  listMethods: async () => fetch(`${BASE}/finance/payment-methods`, { credentials: 'include' }).then((r) => r.json()),
  createMethod: async (payload: any) => fetch(`${BASE}/finance/payment-methods`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  createTransaction: async (payload: any) => fetch(`${BASE}/finance/transactions`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  createLedgerEntry: async (customerId: number, payload: any) => fetch(`${BASE}/finance/customers/${customerId}/ledger`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  createExpense: async (payload: any) => fetch(`${BASE}/finance/expenses`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  createRefund: async (payload: any) => fetch(`${BASE}/finance/refunds`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  startWorkSession: async (payload: any) => fetch(`${BASE}/finance/work-sessions`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  closeWorkSession: async (id: number, payload: any) => fetch(`${BASE}/finance/work-sessions/${id}/close`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
  createDailyClosing: async (payload: any) => fetch(`${BASE}/finance/daily-closings`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()),
};

export default financeApi;
