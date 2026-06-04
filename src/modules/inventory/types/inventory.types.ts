export type StockBalance = {
  product_id: number;
  sku: string;
  default_name: string;
  unit_name_ru: string;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
};

export type StockMovement = {
  id: number;
  product_id: number;
  movement_type: 'purchase_in' | 'adjustment_in' | 'adjustment_out' | 'reservation_consume';
  quantity: string;
  unit_cost: string | null;
  source_type: string;
  source_id: number;
  note: string | null;
  created_by_user_id: number | null;
  created_at: string;
};

export type Reservation = {
  id: number;
  product_id: number;
  quantity: string;
  status: 'active' | 'consumed' | 'released' | 'cancelled';
  source_type: string;
  source_id: number;
  notes: string | null;
  created_at: string;
  consumed_at: string | null;
  released_at: string | null;
};

export type ReservationRequest = {
  productId: number;
  quantity: number;
  sourceType: string;
  sourceId: number;
  notes?: string | null;
};

export type PurchaseRequest = {
  supplierId?: number | null;
  notes?: string | null;
  lines: Array<{
    productId: number;
    quantity: number;
    unitCost: number;
  }>;
};

export type Purchase = {
  id: number;
  supplier_id: number | null;
  status: 'draft' | 'received';
  notes: string | null;
  created_at: string;
  received_at: string | null;
  lines: Array<{
    id: number;
    purchase_order_id: number;
    product_id: number;
    quantity: string;
    unit_cost: string;
    received_quantity: string;
  }>;
};

export type AdjustmentRequest = {
  reason: string;
  notes?: string | null;
  lines: Array<{
    productId: number;
    direction: 'in' | 'out';
    quantity: number;
    unitCost?: number | null;
    notes?: string | null;
  }>;
};

export type Adjustment = {
  id: number;
  reason: string;
  notes: string | null;
  created_at: string;
  lines: Array<{
    id: number;
    adjustment_id: number;
    product_id: number;
    direction: 'in' | 'out';
    quantity: string;
    unit_cost: string | null;
    notes: string | null;
  }>;
};
