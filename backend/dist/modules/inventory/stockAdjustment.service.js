import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryRepository } from './inventory.repository.js';
export class StockAdjustmentService {
    inventoryRepository;
    auditService;
    constructor(inventoryRepository = new InventoryRepository(), auditService = new AuditService()) {
        this.inventoryRepository = inventoryRepository;
        this.auditService = auditService;
    }
    async createAdjustment(input, actorUserId, ipAddress) {
        const adjustment = await this.inventoryRepository.createAdjustment(input, actorUserId);
        if (!adjustment)
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create stock adjustment');
        await this.auditService.log({
            actorUserId,
            actionCode: 'inventory.stock.adjusted',
            module: 'inventory',
            entityType: 'inventory_adjustments',
            entityId: Number(adjustment.id),
            newValues: input,
            ipAddress,
        });
        return adjustment;
    }
}
