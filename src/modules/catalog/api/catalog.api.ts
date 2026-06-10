import { httpClient } from '../../../shared/api/httpClient';
import type {
  Category,
  CategoryRequest,
  Product,
  ProductRequest,
  ProductSupplierLink,
  ProductSupplierRequest,
  ProductUpdateRequest,
  Service,
  Supplier,
  SupplierRequest,
  Unit,
} from '../types/catalog.types';

type ProductListOptions = {
  page?: number;
  pageSize?: number;
};

export const catalogApi = {
  listProducts(search?: string, options?: ProductListOptions) {
    const query = new URLSearchParams();
    if (search) {
      query.set('search', search);
    }
    if (options?.page) {
      query.set('page', String(options.page));
    }
    if (options?.pageSize) {
      query.set('pageSize', String(options.pageSize));
    }

    const params = query.toString() ? `?${query.toString()}` : '';
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
  listSuppliers() {
    return httpClient.get<{ items: Supplier[] }>('/api/suppliers');
  },
  listServices(module?: string) {
    const params = module ? `?module=${encodeURIComponent(module)}` : '';
    return httpClient.get<{ items: Service[] }>(`/api/services${params}`);
  },
  createSupplier(payload: SupplierRequest) {
    return httpClient.post<{ supplier: { id: number; name: string } }>('/api/suppliers', payload);
  },
  getProductSuppliers(id: number | string) {
    return httpClient.get<{ items: ProductSupplierLink[] }>(`/api/products/${id}/suppliers`);
  },
  updateProductSuppliers(id: number | string, payload: { suppliers: ProductSupplierRequest[] }) {
    return httpClient.put<{ items: ProductSupplierLink[] }>(`/api/products/${id}/suppliers`, payload);
  },
};
