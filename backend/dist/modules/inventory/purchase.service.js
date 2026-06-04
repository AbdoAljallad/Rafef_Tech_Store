import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryRepository } from './inventory.repository.js';
export class PurchaseService {
    inventoryRepository;
    auditService;
    constructor(inventoryRepository = new InventoryRepository(), auditService = new AuditService()) {
        this.inventoryRepository = inventoryRepository;
        this.auditService = auditService;
    }
    async createPurchase(input, actorUserId) {
        const purchase = await this.inventoryRepository.createPurchase(input, actorUserId);
        if (!purchase)
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create purchase');
        return purchase;
    }
    async receivePurchase(id, actorUserId, ipAddress) {
        const purchase = await this.inventoryRepository.receivePurchase(id, actorUserId);
        if (!purchase)
            throw new AppError(404, 'NOT_FOUND', 'Purchase not found');
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
