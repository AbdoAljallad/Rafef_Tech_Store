import { httpClient } from '../../../shared/api/httpClient';
import type {
  ContactCreateRequest,
  Customer,
  CustomerCreateRequest,
  CustomerSortMode,
  CustomerUpdateRequest,
  LocationCreateRequest,
  NoteCreateRequest,
} from '../types/crm.types';

export const crmApi = {
  listCustomers(search?: string, options?: { page?: number; pageSize?: number; sortMode?: CustomerSortMode }) {
    const params = new URLSearchParams();

    if (search) {
      params.set('search', search);
    }

    if (options?.page) {
      params.set('page', String(options.page));
    }

    if (options?.pageSize) {
      params.set('pageSize', String(options.pageSize));
    }

    if (options?.sortMode) {
      params.set('sort', options.sortMode);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return httpClient.get<{
      items: Customer[];
      meta: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/customers${query}`);
  },

  createCustomer(payload: CustomerCreateRequest) {
    return httpClient.post<{ customer: Customer }>('/api/customers', payload);
  },

  getCustomer(id: number | string) {
    return httpClient.get<{ customer: Customer }>(`/api/customers/${id}`);
  },

  updateCustomer(id: number | string, payload: CustomerUpdateRequest) {
    return httpClient.patch<{ customer: Customer }>(`/api/customers/${id}`, payload);
  },

  addContact(id: number | string, payload: ContactCreateRequest) {
    return httpClient.post<{ contact: { id: number } }>(`/api/customers/${id}/contacts`, payload);
  },

  addLocation(id: number | string, payload: LocationCreateRequest) {
    return httpClient.post<{ location: { id: number } }>(`/api/customers/${id}/locations`, payload);
  },

  addNote(id: number | string, payload: NoteCreateRequest) {
    return httpClient.post<{ note: { id: number } }>(`/api/customers/${id}/notes`, payload);
  },
};
