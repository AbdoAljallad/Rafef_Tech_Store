import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryRepository } from './inventory.repository.js';
import type { ReservationCreateInput } from './inventory.schemas.js';

export class StockReservationService {
  constructor(
    private readonly inventoryRepository = new InventoryRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async createReservation(input: ReservationCreateInput, actorUserId: number, ipAddress?: string | null) {
    const reservation = await this.inventoryRepository.createReservation(input, actorUserId);
    if (!reservation) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create reservation');
    await this.auditService.log({
      actorUserId,
      actionCode: 'inventory.stock.reserved',
      module: 'inventory',
      entityType: 'inventory_stock_reservations',
      entityId: Number(reservation.id),
      newValues: input,
      ipAddress,
    });
    return reservation;
  }

  async consumeReservation(id: number, actorUserId: number, ipAddress?: string | null) {
    const reservation = await this.inventoryRepository.consumeReservation(id, actorUserId);
    if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    await this.auditService.log({
      actorUserId,
      actionCode: 'inventory.stock.consumed',
      module: 'inventory',
      entityType: 'inventory_stock_reservations',
      entityId: id,
      newValues: reservation,
      ipAddress,
    });
    return reservation;
  }

  async releaseReservation(id: number, actorUserId: number, ipAddress?: string | null) {
    const reservation = await this.inventoryRepository.releaseReservation(id, actorUserId);
    if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    await this.auditService.log({
      actorUserId,
      actionCode: 'inventory.reservation.released',
      module: 'inventory',
      entityType: 'inventory_stock_reservations',
      entityId: id,
      newValues: reservation,
      ipAddress,
    });
    return reservation;
  }
}
