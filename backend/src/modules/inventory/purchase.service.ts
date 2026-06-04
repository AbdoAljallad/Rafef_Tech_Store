import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryRepository } from './inventory.repository.js';
import type { PurchaseCreateInput } from './inventory.schemas.js';

export class PurchaseService {
  constructor(
    private readonly inventoryRepository = new InventoryRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async createPurchase(input: PurchaseCreateInput, actorUserId: number) {
    const purchase = await this.inventoryRepository.createPurchase(input, actorUserId);
    if (!purchase) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create purchase');
    return purchase;
  }

  async receivePurchase(id: number, actorUserId: number, ipAddress?: string | null) {
    const purchase = await this.inventoryRepository.receivePurchase(id, actorUserId);
    if (!purchase) throw new AppError(404, 'NOT_FOUND', 'Purchase not found');
    await this.auditService.log({
      actorUserId,
      actionCode: 'inventory.purchase.received',
      module: 'inventory',
      entityType: 'inventory_purchase_orders',
      entityId: id,
      newValues: purchase,
      ipAddress,
    });
    return purchase;
  }
}
