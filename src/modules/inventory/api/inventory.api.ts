import { httpClient } from '../../../shared/api/httpClient';
import type {
  Adjustment,
  AdjustmentRequest,
  Purchase,
  PurchaseRequest,
  Reservation,
  ReservationRequest,
  StockBalance,
  StockMovement,
} from '../types/inventory.types';

export const inventoryApi = {
  listStock(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return httpClient.get<{ items: StockBalance[] }>(`/api/inventory/stock${params}`);
  },

  listMovements(productId: number | string) {
    return httpClient.get<{ items: StockMovement[] }>(`/api/inventory/products/${productId}/movements`);
  },

  createReservation(payload: ReservationRequest) {
    return httpClient.post<{ reservation: Reservation }>('/api/inventory/reservations', payload);
  },

  consumeReservation(id: number | string) {
    return httpClient.post<{ reservation: Reservation }>(`/api/inventory/reservations/${id}/consume`);
  },

  releaseReservation(id: number | string) {
    return httpClient.post<{ reservation: Reservation }>(`/api/inventory/reservations/${id}/release`);
  },

  createPurchase(payload: PurchaseRequest) {
    return httpClient.post<{ purchase: Purchase }>('/api/inventory/purchases', payload);
  },

  receivePurchase(id: number | string) {
    return httpClient.post<{ purchase: Purchase }>(`/api/inventory/purchases/${id}/receive`);
  },

  createAdjustment(payload: AdjustmentRequest) {
    return httpClient.post<{ adjustment: Adjustment }>('/api/inventory/adjustments', payload);
  },
};
