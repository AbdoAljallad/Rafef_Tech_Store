import { httpClient } from '../../../shared/api/httpClient';

export type RepairDeviceCategory = {
  id: number;
  code: string;
  name_ru: string;
  is_active?: boolean | number;
};

export type RepairBrand = {
  id: number;
  name: string;
  is_active?: boolean | number;
};

export type RepairModel = {
  id: number;
  category_id: number;
  brand_id: number;
  name: string;
  category_name_ru?: string | null;
  brand_name?: string | null;
  is_active?: boolean | number;
};

export type RepairCustomerDevice = {
  id: number;
  customer_id: number;
  category_id: number;
  brand_id: number | null;
  model_id: number | null;
  device_name: string;
  serial_no: string | null;
  imei: string | null;
  notes: string | null;
  created_at: string;
  category_name_ru?: string | null;
  brand_name?: string | null;
  model_name?: string | null;
};

export const repairApi = {
  listCategories() {
    return httpClient.get<{ items: RepairDeviceCategory[] }>('/api/repair/device-categories');
  },
  createCategory(payload: { code: string; nameRu: string }) {
    return httpClient.post<{ category: RepairDeviceCategory }>('/api/repair/device-categories', payload);
  },
  listBrands() {
    return httpClient.get<{ items: RepairBrand[] }>('/api/repair/brands');
  },
  createBrand(payload: { name: string }) {
    return httpClient.post<{ brand: RepairBrand }>('/api/repair/brands', payload);
  },
  listModels() {
    return httpClient.get<{ items: RepairModel[] }>('/api/repair/models');
  },
  createModel(payload: { categoryId: number; brandId: number; name: string }) {
    return httpClient.post<{ model: RepairModel }>('/api/repair/models', payload);
  },
  createDevice(payload: { customerId: number; categoryId: number; brandId?: number | null; modelId?: number | null; deviceName: string }) {
    return httpClient.post<{ device: RepairCustomerDevice }>('/api/repair/devices', payload);
  },
  listCustomerDevices(customerId: number | string) {
    return httpClient.get<{ items: RepairCustomerDevice[] }>(`/api/repair/customers/${customerId}/devices`);
  },

  listOrders(params?: { offset?: number; limit?: number }) {
    const limit = params?.limit ?? 20;
    const page = Math.floor((params?.offset ?? 0) / limit) + 1;
    const q = params ? `?page=${page}&pageSize=${limit}` : '';
    return httpClient.get<{ items: any[] }>(`/api/repair/orders${q}`);
  },
  createOrder(payload: any) {
    return httpClient.post<{ order: any }>('/api/repair/orders', payload);
  },
  getOrder(id: number | string) {
    return httpClient.get<{ order: any }>(`/api/repair/orders/${id}`);
  },
  getOrderBilling(id: number | string) {
    return httpClient.get<{ billing: any }>(`/api/repair/orders/${id}/billing`);
  },
  deleteOrder(id: number | string) {
    return httpClient.delete<void>(`/api/repair/orders/${id}`);
  },
  addService(orderId: number | string, payload: any) {
    return httpClient.post<{ service: any }>(`/api/repair/orders/${orderId}/services`, payload);
  },
  updateService(orderId: number | string, serviceId: number | string, payload: any) {
    return httpClient.patch<{ order: any }>(`/api/repair/orders/${orderId}/services/${serviceId}`, payload);
  },
  removeService(orderId: number | string, serviceId: number | string) {
    return httpClient.delete<void>(`/api/repair/orders/${orderId}/services/${serviceId}`);
  },
  addPart(orderId: number | string, payload: any) {
    return httpClient.post<{ part: any }>(`/api/repair/orders/${orderId}/parts`, payload);
  },
  updatePart(orderId: number | string, partId: number | string, payload: any) {
    return httpClient.patch<{ order: any }>(`/api/repair/orders/${orderId}/parts/${partId}`, payload);
  },
  removePart(orderId: number | string, partId: number | string) {
    return httpClient.delete<void>(`/api/repair/orders/${orderId}/parts/${partId}`);
  },
  changeStatus(orderId: number | string, payload: any) {
    return httpClient.post<{ order: any }>(`/api/repair/orders/${orderId}/status`, payload);
  },
  addNote(orderId: number | string, payload: any) {
    return httpClient.post<{ note: any }>(`/api/repair/orders/${orderId}/notes`, payload);
  },
  receipt(orderId: number | string) {
    return httpClient.get<{ receipt: any }>(`/api/repair/orders/${orderId}/receipt`);
  },
};
