export type Unit = { id: number; code: string; name_ru: string; allows_fraction: number };
export type Category = { id: number; code: string; default_name: string; parent_id: number | null };
export type Product = {
  id: number;
  category_id: number;
  unit_id: number;
  sku: string;
  default_name: string;
  tracking_type: 'quantity' | 'serial' | 'batch';
  current_purchase_price: string;
  current_sale_price: string;
  reorder_threshold: string;
  category_name: string;
  unit_name_ru: string;
};
export type Service = { id: number; code: string; default_name: string; module: string; default_price: string; category_name: string };
export type ProductRequest = {
  categoryId: number;
  unitId: number;
  sku: string;
  defaultName: string;
  trackingType: 'quantity' | 'serial' | 'batch';
  currentPurchasePrice: number;
  currentSalePrice: number;
  reorderThreshold: number;
  barcode?: string | null;
};
export type ProductUpdateRequest = Partial<Omit<ProductRequest, 'barcode'>>;
export type CategoryRequest = {
  code: string;
  defaultName: string;
  parentId?: number | null;
  showInSales: boolean;
  showInRepair: boolean;
  showInProjects: boolean;
  showInCreative: boolean;
};
export type SupplierRequest = { name: string; phone?: string | null; email?: string | null; addressText?: string | null; notes?: string | null };
