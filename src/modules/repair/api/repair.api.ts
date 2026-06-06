import { httpClient } from '../../../shared/api/httpClient';

export const repairApi = {
  listCategories() { return httpClient.get<{ items: any[] }>('/api/repair/device-categories'); },
  createCategory(payload: any) { return httpClient.post<{ category: any }>('/api/repair/device-categories', payload); },
  listBrands() { return httpClient.get<{ items: any[] }>('/api/repair/brands'); },
  createBrand(payload: any) { return httpClient.post<{ brand: any }>('/api/repair/brands', payload); },
  listModels() { return httpClient.get<{ items: any[] }>('/api/repair/models'); },
  createModel(payload: any) { return httpClient.post<{ model: any }>('/api/repair/models', payload); },
  createDevice(payload: any) { return httpClient.post<{ device: any }>('/api/repair/devices', payload); },

  listOrders(params?: { offset?: number; limit?: number }) {
    const limit = params?.limit ?? 20;
    const page = Math.floor((params?.offset ?? 0) / limit) + 1;
    const q = params ? `?page=${page}&pageSize=${limit}` : '';
    return httpClient.get<{ items: any[] }>(`/api/repair/orders${q}`);
  },
  createOrder(payload: any) { return httpClient.post<{ order: any }>('/api/repair/orders', payload); },
  getOrder(id: number | string) { return httpClient.get<{ order: any }>(`/api/repair/orders/${id}`); },
  addService(orderId: number | string, payload: any) { return httpClient.post<{ service: any }>(`/api/repair/orders/${orderId}/services`, payload); },
  addPart(orderId: number | string, payload: any) { return httpClient.post<{ part: any }>(`/api/repair/orders/${orderId}/parts`, payload); },
  changeStatus(orderId: number | string, payload: any) { return httpClient.post<{ order: any }>(`/api/repair/orders/${orderId}/status`, payload); },
  addNote(orderId: number | string, payload: any) { return httpClient.post<{ note: any }>(`/api/repair/orders/${orderId}/notes`, payload); },
  receipt(orderId: number | string) { return httpClient.get<{ receipt: any }>(`/api/repair/orders/${orderId}/receipt`); },
};
