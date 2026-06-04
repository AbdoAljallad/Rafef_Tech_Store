import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryRepository } from './inventory.repository.js';
import type { AdjustmentCreateInput } from './inventory.schemas.js';

export class StockAdjustmentService {
  constructor(
    private readonly inventoryRepository = new InventoryRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async createAdjustment(input: AdjustmentCreateInput, actorUserId: number, ipAddress?: string | null) {
    const adjustment = await this.inventoryRepository.createAdjustment(input, actorUserId);
    if (!adjustment) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create stock adjustment');
    await this.auditService.log({
      actorUserId,
      actionCode: 'inventory.stock.adjusted',
      module: 'inventory',
      entityType: 'inventory_adjustments',
      entityId: Number((adjustment as unknown as { id: number }).id),
      newValues: input,
      ipAddress,
    });
    return adjustment;
  }
}
