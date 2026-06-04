import { httpClient } from '../../../shared/api/httpClient';

export const salesApi = {
  listInvoices(params?: { offset?: number; limit?: number }) {
    const q = params ? `?offset=${params.offset ?? 0}&limit=${params.limit ?? 50}` : '';
    return httpClient.get<{ items: any[] }>(`/api/sales/invoices${q}`);
  },
  createInvoice(payload: any) {
    return httpClient.post<{ invoice: any }>('/api/sales/invoices', payload);
  },
  getInvoice(id: number | string) {
    return httpClient.get<{ invoice: any }>(`/api/sales/invoices/${id}`);
  },
  approveInvoice(id: number | string) {
    return httpClient.post<{ invoice: any }>(`/api/sales/invoices/${id}/approve`, { approve: true });
  },
  voidInvoice(id: number | string, payload: any) {
    return httpClient.post<{ invoice: any }>(`/api/sales/invoices/${id}/void`, payload);
  },
  createReturn(payload: any) {
    return httpClient.post<{ return: any }>('/api/sales/returns', payload);
  },
};
