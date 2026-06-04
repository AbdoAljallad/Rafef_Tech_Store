import { InventoryRepository } from '../inventory/inventory.repository.js';
import { SalesRepository } from './sales.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../shared/errors/AppError.js';
export class SalesService {
    salesRepo;
    inventoryRepo;
    auditService;
    constructor(salesRepo = new SalesRepository(), inventoryRepo = new InventoryRepository(), auditService = new AuditService()) {
        this.salesRepo = salesRepo;
        this.inventoryRepo = inventoryRepo;
        this.auditService = auditService;
    }
    async createInvoice(input, actorUserId, ip) {
        const invoice = await this.salesRepo.createInvoice({ customerId: input.customerId ?? null, isWalkIn: input.isWalkIn ?? true, createdBy: actorUserId });
        if (!invoice || !invoice.id)
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create invoice');
        for (const l of input.lines) {
            // fetch product cost if needed
            let unitCost = null;
            try {
                const p = await this.inventoryRepo.listStock({ search: '', offset: 0, limit: 1 });
                unitCost = null;
            }
            catch (e) {
                unitCost = null;
            }
            await this.salesRepo.addLine(invoice.id, { productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, unitCost });
        }
        await this.auditService.log({ actorUserId, actionCode: 'sales.invoice.created', module: 'sales', entityType: 'sales_invoices', entityId: invoice.id, newValues: invoice, ipAddress: ip });
        return this.salesRepo.getInvoiceById(invoice.id);
    }
    async listInvoices(offset = 0, limit = 50) {
        return this.salesRepo.listInvoices({ offset, limit });
    }
    async getInvoice(id) {
        return this.salesRepo.getInvoiceById(id);
    }
    async approveInvoice(id, actorUserId, ip) {
        const invoice = await this.salesRepo.getInvoiceById(id);
        if (!invoice)
            throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
        if (invoice.status !== 'draft')
            throw new AppError(409, 'STATE_CONFLICT', 'Only draft invoices can be approved');
        // create inventory adjustment out for each line to deduct stock
        const lines = invoice.lines ?? [];
        if (lines.length > 0) {
            const adjustment = {
                reason: `Invoice ${invoice.invoice_code} sale`,
                notes: null,
                lines: lines.map((l) => ({ productId: l.product_id, direction: 'out', quantity: Number(l.quantity), unitCost: l.unit_cost ?? null })),
            };
            await this.inventoryRepo.createAdjustment(adjustment, actorUserId);
        }
        const updated = await this.salesRepo.markApproved(id, actorUserId);
        await this.auditService.log({ actorUserId, actionCode: 'sales.invoice.approved', module: 'sales', entityType: 'sales_invoices', entityId: id, newValues: updated, ipAddress: ip });
        return updated;
    }
    async voidInvoice(id, actorUserId, ip) {
        return this.salesRepo.markVoided(id, actorUserId).then(async (updated) => {
            await this.auditService.log({ actorUserId, actionCode: 'sales.invoice.voided', module: 'sales', entityType: 'sales_invoices', entityId: id, newValues: updated, ipAddress: ip });
            return updated;
        });
    }
    async createReturn(input, actorUserId, ip) {
        const ret = await this.salesRepo.createReturn({ invoiceId: input.invoiceId, createdBy: actorUserId });
        if (!ret || !ret.id)
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create return');
        for (const l of input.lines) {
            await this.salesRepo.addReturnLine(ret.id, { productId: l.productId, quantity: l.quantity });
            // Add stock back via adjustment in (simple)
            await this.inventoryRepo.createAdjustment({ reason: `Return ${ret.return_code}`, notes: null, lines: [{ productId: l.productId, direction: 'in', quantity: Number(l.quantity), unitCost: null }] }, actorUserId);
        }
        await this.auditService.log({ actorUserId, actionCode: 'sales.return.created', module: 'sales', entityType: 'sales_returns', entityId: ret.id, newValues: ret, ipAddress: ip });
        return this.salesRepo.getReturnById(ret.id);
    }
}
