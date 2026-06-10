type StockSnapshot = {
  quantity_on_hand?: number | string | null;
  quantity_reserved?: number | string | null;
  quantity_available?: number | string | null;
  reorder_threshold?: number | string | null;
};

export function stockNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export function getOnHandQuantity(item?: StockSnapshot | null) {
  return Math.max(stockNumber(item?.quantity_on_hand), 0);
}

export function getReservedQuantity(item?: StockSnapshot | null) {
  return Math.max(stockNumber(item?.quantity_reserved), 0);
}

export function getAvailableQuantity(item?: StockSnapshot | null) {
  return Math.max(stockNumber(item?.quantity_available ?? item?.quantity_on_hand), 0);
}

export function getReorderThreshold(item?: StockSnapshot | null) {
  return Math.max(stockNumber(item?.reorder_threshold), 0);
}

export function hasAvailableStock(item?: StockSnapshot | null) {
  return getAvailableQuantity(item) > 0;
}
