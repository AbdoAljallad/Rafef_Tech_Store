import { httpClient } from '../../../shared/api/httpClient';
import type {
  SalesInvoice,
  SalesInvoiceCreatePayload,
  SalesInvoiceListFilters,
  SalesInvoiceListResponse,
  SalesInvoicePrintPayload,
} from '../types/sales.types';

export const salesApi = {
  listInvoices(params: SalesInvoiceListFilters = {}) {
    const pageSize = params.pageSize ?? params.limit ?? 50;
    const page = params.page ?? Math.floor((params.offset ?? 0) / pageSize) + 1;
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (params.search?.trim()) {
      query.set('search', params.search.trim());
    }

    if (params.documentType && params.documentType !== 'all') {
      query.set('documentType', params.documentType);
    }

    if (params.status && params.status !== 'all') {
      query.set('status', params.status);
    }

    if (params.dateFrom) {
      query.set('dateFrom', params.dateFrom);
    }

    if (params.dateTo) {
      query.set('dateTo', params.dateTo);
    }

    return httpClient.get<SalesInvoiceListResponse>(`/api/sales/invoices?${query.toString()}`);
  },
  createInvoice(payload: SalesInvoiceCreatePayload) {
    return httpClient.post<{ invoice: SalesInvoice }>('/api/sales/invoices', payload);
  },
  getInvoice(id: number | string) {
    return httpClient.get<{ invoice: SalesInvoice }>(`/api/sales/invoices/${id}`);
  },
  updateInvoice(id: number | string, payload: SalesInvoicePrintPayload) {
    return httpClient.patch<{ invoice: SalesInvoice }>(`/api/sales/invoices/${id}`, payload);
  },
  approveInvoice(id: number | string) {
    return httpClient.post<{ invoice: SalesInvoice }>(`/api/sales/invoices/${id}/approve`, { approve: true });
  },
  voidInvoice(id: number | string, payload: any) {
    return httpClient.post<{ invoice: SalesInvoice }>(`/api/sales/invoices/${id}/void`, payload);
  },
  createReturn(payload: any) {
    return httpClient.post<{ return: any }>('/api/sales/returns', payload);
  },
};
