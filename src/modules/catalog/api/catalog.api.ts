import { httpClient } from '../../../shared/api/httpClient';
import type { Category, CategoryRequest, Product, ProductRequest, ProductUpdateRequest, Service, SupplierRequest, Unit } from '../types/catalog.types';

export const catalogApi = {
  listProducts(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return httpClient.get<{ items: Product[] }>(`/api/products${params}`);
  },
  createProduct(payload: ProductRequest) {
    return httpClient.post<{ product: Product }>('/api/products', payload);
  },
  getProduct(id: number | string) {
    return httpClient.get<{ product: Product }>(`/api/products/${id}`);
  },
  updateProduct(id: number | string, payload: ProductUpdateRequest) {
    return httpClient.patch<{ product: Product }>(`/api/products/${id}`, payload);
  },
  changePrice(id: number | string, payload: { newPurchasePrice: number; newSalePrice: number; reason?: string | null }) {
    return httpClient.post<{ product: Product }>(`/api/products/${id}/price-change`, payload);
  },
  lookupBarcode(barcode: string) {
    return httpClient.get<{ product: Product }>(`/api/barcodes/${encodeURIComponent(barcode)}/product`);
  },
  listCategories() {
    return httpClient.get<{ items: Category[] }>('/api/categories');
  },
  createCategory(payload: CategoryRequest) {
    return httpClient.post<{ category: Category }>('/api/categories', payload);
  },
  listUnits() {
    return httpClient.get<{ items: Unit[] }>('/api/units');
  },
  listServices(module?: string) {
    const params = module ? `?module=${encodeURIComponent(module)}` : '';
    return httpClient.get<{ items: Service[] }>(`/api/services${params}`);
  },
  createSupplier(payload: SupplierRequest) {
    return httpClient.post<{ supplier: { id: number; name: string } }>('/api/suppliers', payload);
  },
};
