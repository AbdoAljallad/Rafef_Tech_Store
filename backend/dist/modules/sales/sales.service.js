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
        const prepared = await this.prepareInvoice(input);
        const invoice = await this.salesRepo.createInvoice({
            customerId: prepared.customerId,
            repairOrderId: prepared.repairOrderId,
            isWalkIn: prepared.isWalkIn,
            documentType: input.documentType,
            noteText: input.noteText ?? null,
            a4HeaderText: input.a4HeaderText ?? null,
            a4FooterText: input.a4FooterText ?? null,
            receiptHeaderText: input.receiptHeaderText ?? null,
            receiptFooterText: input.receiptFooterText ?? null,
            createdBy: actorUserId,
        });
        if (!invoice || !invoice.id)
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create invoice');
        for (const line of prepared.lines) {
            await this.salesRepo.addLine(invoice.id, line);
        }
        const createdInvoice = await this.salesRepo.recalculateInvoiceTotals(invoice.id);
        await this.auditService.log({
            actorUserId,
            actionCode: input.documentType === 'quote' ? 'sales.quote.created' : 'sales.invoice.created',
            module: 'sales',
            entityType: 'sales_invoices',
            entityId: invoice.id,
            newValues: createdInvoice,
            ipAddress: ip,
        });
        return createdInvoice;
    }
    async listInvoices(params = {}) {
        return this.salesRepo.listInvoices(params);
    }
    async getInvoice(id) {
        return this.salesRepo.getInvoiceById(id);
    }
    async updateInvoicePrintContent(id, input, actorUserId, ip) {
        const before = await this.salesRepo.getInvoiceById(id);
        if (!before)
            throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
        const updated = await this.salesRepo.updateInvoicePrintContent(id, input);
        await this.auditService.log({
            actorUserId,
            actionCode: 'sales.invoice.print_content_updated',
            module: 'sales',
            entityType: 'sales_invoices',
            entityId: id,
            oldValues: before,
            newValues: updated,
            ipAddress: ip,
        });
        return updated;
    }
    async approveInvoice(id, actorUserId, payload, ip) {
        const updated = await this.salesRepo.approveInvoice(id, actorUserId, payload);
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
        const sourceInvoice = await this.salesRepo.getInvoiceById(input.invoiceId);
        if (!sourceInvoice)
            throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
        if (sourceInvoice.document_type !== 'invoice') {
            throw new AppError(409, 'STATE_CONFLICT', 'Cannot create a return from a price statement');
        }
        const ret = await this.salesRepo.createReturn({ invoiceId: input.invoiceId, createdBy: actorUserId });
        if (!ret || !ret.id)
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create return');
        for (const l of input.lines) {
            await this.salesRepo.addReturnLine(ret.id, { productId: l.productId, quantity: l.quantity });
            await this.inventoryRepo.createAdjustment({
                reason: `Return ${ret.return_code}`,
                notes: null,
                lines: [{ productId: l.productId, direction: 'in', quantity: Number(l.quantity), unitCost: null }],
            }, actorUserId);
        }
        await this.auditService.log({ actorUserId, actionCode: 'sales.return.created', module: 'sales', entityType: 'sales_returns', entityId: ret.id, newValues: ret, ipAddress: ip });
        return this.salesRepo.getReturnById(ret.id);
    }
    async prepareInvoice(input) {
        let repairOrderId = input.repairOrderId ?? null;
        let customerId = input.customerId ?? null;
        let isWalkIn = input.isWalkIn ?? true;
        const preparedLines = [];
        for (const line of input.lines) {
            switch (line.lineType ?? 'product') {
                case 'product':
                    preparedLines.push(await this.prepareProductLine(line));
                    break;
                case 'repair_service': {
                    const preparedLine = await this.prepareRepairServiceLine(line);
                    preparedLines.push(preparedLine.line);
                    repairOrderId = this.mergeRepairOrderId(repairOrderId, preparedLine.repairOrderId);
                    break;
                }
                case 'repair_part': {
                    const preparedLine = await this.prepareRepairPartLine(line);
                    preparedLines.push(preparedLine.line);
                    repairOrderId = this.mergeRepairOrderId(repairOrderId, preparedLine.repairOrderId);
                    break;
                }
            }
        }
        if (repairOrderId) {
            const order = await this.salesRepo.getRepairOrderHeader(repairOrderId);
            if (!order) {
                throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
            }
            if (order.status === 'cancelled' && input.documentType === 'invoice') {
                throw new AppError(409, 'STATE_CONFLICT', 'Cannot create an invoice for a cancelled repair order');
            }
            if (customerId && Number(customerId) !== Number(order.customer_id)) {
                throw new AppError(409, 'STATE_CONFLICT', 'Invoice customer must match the repair order customer');
            }
            customerId = Number(order.customer_id);
            isWalkIn = false;
        }
        return {
            customerId,
            repairOrderId,
            isWalkIn,
            lines: preparedLines,
        };
    }
    async prepareProductLine(line) {
        const product = await this.salesRepo.findProductPricing(line.productId);
        if (!product) {
            throw new AppError(404, 'NOT_FOUND', `Product ${line.productId} not found`);
        }
        return {
            lineType: 'product',
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: Number(product.current_purchase_price ?? 0),
            descriptionSnapshot: product.default_name,
            skuSnapshot: product.sku,
            categoryNameSnapshot: product.category_name,
            sourceType: 'catalog_product',
            sourceId: line.productId,
        };
    }
    async prepareRepairServiceLine(line) {
        const service = await this.salesRepo.findRepairServiceBillable(line.repairOrderServiceId);
        if (!service) {
            throw new AppError(404, 'NOT_FOUND', 'Repair service not found');
        }
        if (service.sales_invoice_id) {
            throw new AppError(409, 'STATE_CONFLICT', 'Repair service has already been billed');
        }
        const quantity = Number(service.quantity);
        if (line.quantity !== undefined && Math.abs(Number(line.quantity) - quantity) > 0.000001) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Repair service quantity must match the repair order');
        }
        return {
            repairOrderId: Number(service.repair_order_id),
            line: {
                lineType: 'repair_service',
                quantity,
                unitPrice: line.unitPrice ?? Number(service.unit_price_snapshot ?? 0),
                unitCost: null,
                descriptionSnapshot: service.service_name_snapshot,
                categoryNameSnapshot: 'repair',
                repairOrderServiceId: line.repairOrderServiceId,
                sourceType: 'repair_order_service',
                sourceId: line.repairOrderServiceId,
            },
        };
    }
    async prepareRepairPartLine(line) {
        const part = await this.salesRepo.findRepairPartBillable(line.repairOrderPartId);
        if (!part) {
            throw new AppError(404, 'NOT_FOUND', 'Repair part not found');
        }
        if (part.sales_invoice_id) {
            throw new AppError(409, 'STATE_CONFLICT', 'Repair part has already been billed');
        }
        if (part.reservation_status && part.reservation_status !== 'active') {
            throw new AppError(409, 'STATE_CONFLICT', 'Repair part reservation is not active');
        }
        const quantity = Number(part.quantity);
        if (line.quantity !== undefined && Math.abs(Number(line.quantity) - quantity) > 0.000001) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Repair part quantity must match the reserved quantity');
        }
        return {
            repairOrderId: Number(part.repair_order_id),
            line: {
                lineType: 'repair_part',
                productId: Number(part.product_id),
                quantity,
                unitPrice: line.unitPrice ?? Number(part.current_sale_price ?? 0),
                unitCost: Number(part.unit_cost_snapshot ?? 0),
                descriptionSnapshot: part.product_name_snapshot,
                skuSnapshot: part.product_sku,
                categoryNameSnapshot: part.category_name,
                reservationId: Number(part.reservation_id),
                repairOrderPartId: line.repairOrderPartId,
                sourceType: 'repair_order_part',
                sourceId: line.repairOrderPartId,
            },
        };
    }
    mergeRepairOrderId(current, next) {
        if (!current) {
            return next;
        }
        if (Number(current) !== Number(next)) {
            throw new AppError(409, 'STATE_CONFLICT', 'All repair lines in one invoice must belong to the same repair order');
        }
        return current;
    }
}
