import { InventoryRepository } from '../inventory/inventory.repository.js';
import { SalesRepository } from './sales.repository.js';
import { AuditService } from '../audit/audit.service.js';
import type {
  InvoiceCreateInput,
  InvoiceLineInput,
  InvoiceListQueryInput,
  InvoiceUpdateInput,
  ReturnCreateInput,
} from './sales.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { InvoiceInsertLine } from './sales.repository.js';

export class SalesService {
  constructor(
    private readonly salesRepo = new SalesRepository(),
    private readonly inventoryRepo = new InventoryRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async createInvoice(input: InvoiceCreateInput, actorUserId: number, ip?: string | null) {
    const prepared = await this.prepareInvoice(input);
    const invoice = await this.salesRepo.createInvoice({
      customerId: prepared.customerId,
      repairOrderId: prepared.repairOrderId,
      projectId: prepared.projectId,
      isWalkIn: prepared.isWalkIn,
      documentType: input.documentType,
      noteText: input.noteText ?? null,
      a4HeaderText: input.a4HeaderText ?? null,
      a4FooterText: input.a4FooterText ?? null,
      receiptHeaderText: input.receiptHeaderText ?? null,
      receiptFooterText: input.receiptFooterText ?? null,
      createdBy: actorUserId,
    });
    if (!invoice || !invoice.id) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create invoice');

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

  async listInvoices(params: InvoiceListQueryInput & { offset?: number; limit?: number } = {}) {
    return this.salesRepo.listInvoices(params);
  }

  async getInvoice(id: number) {
    return this.salesRepo.getInvoiceById(id);
  }

  async updateInvoicePrintContent(id: number, input: InvoiceUpdateInput, actorUserId: number, ip?: string | null) {
    const before = await this.salesRepo.getInvoiceById(id);
    if (!before) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');

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

  async approveInvoice(
    id: number,
    actorUserId: number,
    payload?: {
      paymentAccountId?: number | null;
      paymentMethodId?: number | null;
      paymentAmount?: number | null;
      paymentReference?: string | null;
    },
    ip?: string | null,
  ) {
    const updated = await this.salesRepo.approveInvoice(id, actorUserId, payload);
    await this.auditService.log({ actorUserId, actionCode: 'sales.invoice.approved', module: 'sales', entityType: 'sales_invoices', entityId: id, newValues: updated, ipAddress: ip });
    return updated;
  }

  async voidInvoice(id: number, actorUserId: number, ip?: string | null) {
    return this.salesRepo.markVoided(id, actorUserId).then(async (updated) => {
      await this.auditService.log({ actorUserId, actionCode: 'sales.invoice.voided', module: 'sales', entityType: 'sales_invoices', entityId: id, newValues: updated, ipAddress: ip });
      return updated;
    });
  }

  async createReturn(input: ReturnCreateInput, actorUserId: number, ip?: string | null) {
    const sourceInvoice = await this.salesRepo.getInvoiceById(input.invoiceId);
    if (!sourceInvoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
    if (sourceInvoice.document_type !== 'invoice') {
      throw new AppError(409, 'STATE_CONFLICT', 'Cannot create a return from a price statement');
    }

    const ret = await this.salesRepo.createReturn({ invoiceId: input.invoiceId, createdBy: actorUserId });
    if (!ret || !ret.id) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create return');
    for (const l of input.lines) {
      await this.salesRepo.addReturnLine(ret.id, { productId: l.productId, quantity: l.quantity });
      await this.inventoryRepo.createAdjustment(
        {
          reason: `Return ${ret.return_code}`,
          notes: null,
          lines: [{ productId: l.productId, direction: 'in' as const, quantity: Number(l.quantity), unitCost: null }],
        } as any,
        actorUserId,
      );
    }
    await this.auditService.log({ actorUserId, actionCode: 'sales.return.created', module: 'sales', entityType: 'sales_returns', entityId: ret.id, newValues: ret, ipAddress: ip });
    return this.salesRepo.getReturnById(ret.id);
  }

  private async prepareInvoice(input: InvoiceCreateInput) {
    let repairOrderId = input.repairOrderId ?? null;
    let projectId = input.projectId ?? null;
    let customerId = input.customerId ?? null;
    let isWalkIn = input.isWalkIn ?? true;
    const preparedLines: InvoiceInsertLine[] = [];

    for (const line of input.lines) {
      switch (line.lineType ?? 'product') {
        case 'product':
          preparedLines.push(await this.prepareProductLine(line as Extract<InvoiceLineInput, { lineType?: 'product' }>));
          break;
        case 'manual':
          preparedLines.push(this.prepareManualLine(line as Extract<InvoiceLineInput, { lineType: 'manual' }>));
          break;
        case 'repair_service': {
          const preparedLine = await this.prepareRepairServiceLine(line as Extract<InvoiceLineInput, { lineType: 'repair_service' }>);
          preparedLines.push(preparedLine.line);
          repairOrderId = this.mergeRepairOrderId(repairOrderId, preparedLine.repairOrderId);
          break;
        }
        case 'repair_part': {
          const preparedLine = await this.prepareRepairPartLine(line as Extract<InvoiceLineInput, { lineType: 'repair_part' }>);
          preparedLines.push(preparedLine.line);
          repairOrderId = this.mergeRepairOrderId(repairOrderId, preparedLine.repairOrderId);
          break;
        }
        case 'project_material': {
          const preparedLine = await this.prepareProjectMaterialLine(line as Extract<InvoiceLineInput, { lineType: 'project_material' }>);
          preparedLines.push(preparedLine.line);
          projectId = this.mergeProjectId(projectId, preparedLine.projectId);
          break;
        }
      }
    }

    if (repairOrderId && projectId) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair and project billing cannot be mixed in one document');
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

    if (projectId) {
      const project = await this.salesRepo.getProjectHeader(projectId);
      if (!project) {
        throw new AppError(404, 'NOT_FOUND', 'Project not found');
      }
      if (project.status === 'cancelled' && input.documentType === 'invoice') {
        throw new AppError(409, 'STATE_CONFLICT', 'Cannot create an invoice for a cancelled project');
      }
      if (customerId && project.customer_id && Number(customerId) !== Number(project.customer_id)) {
        throw new AppError(409, 'STATE_CONFLICT', 'Invoice customer must match the project customer');
      }
      if (project.customer_id) {
        customerId = Number(project.customer_id);
        isWalkIn = false;
      }
    }

    return {
      customerId,
      repairOrderId,
      projectId,
      isWalkIn,
      lines: preparedLines,
    };
  }

  private async prepareProductLine(line: Extract<InvoiceLineInput, { lineType?: 'product' }>) {
    const product = await this.salesRepo.findProductPricing(line.productId);
    if (!product) {
      throw new AppError(404, 'NOT_FOUND', `Product ${line.productId} not found`);
    }

    return {
      lineType: 'product' as const,
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

  private async prepareRepairServiceLine(line: Extract<InvoiceLineInput, { lineType: 'repair_service' }>) {
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
        lineType: 'repair_service' as const,
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

  private async prepareRepairPartLine(line: Extract<InvoiceLineInput, { lineType: 'repair_part' }>) {
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
        lineType: 'repair_part' as const,
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

  private async prepareProjectMaterialLine(line: Extract<InvoiceLineInput, { lineType: 'project_material' }>) {
    const material = await this.salesRepo.findProjectMaterialBillable(line.projectMaterialId);
    if (!material) {
      throw new AppError(404, 'NOT_FOUND', 'Project material not found');
    }
    if (material.sales_invoice_id) {
      throw new AppError(409, 'STATE_CONFLICT', 'Project material has already been billed');
    }
    if (material.reservation_status && material.reservation_status !== 'active') {
      throw new AppError(409, 'STATE_CONFLICT', 'Project material reservation is not active');
    }

    const quantity = Number(material.quantity);
    if (line.quantity !== undefined && Math.abs(Number(line.quantity) - quantity) > 0.000001) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Project material quantity must match the reserved quantity');
    }

    return {
      projectId: Number(material.project_id),
      line: {
        lineType: 'project_material' as const,
        productId: Number(material.product_id),
        quantity,
        unitPrice: line.unitPrice ?? Number(material.current_sale_price ?? 0),
        unitCost: Number(material.unit_cost_snapshot ?? 0),
        descriptionSnapshot: material.product_name_snapshot,
        skuSnapshot: material.product_sku,
        categoryNameSnapshot: material.category_name,
        reservationId: Number(material.reservation_id),
        projectMaterialId: line.projectMaterialId,
        sourceType: 'project_material',
        sourceId: line.projectMaterialId,
      },
    };
  }

  private prepareManualLine(line: Extract<InvoiceLineInput, { lineType: 'manual' }>) {
    return {
      lineType: 'manual' as const,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      unitCost: line.unitCost ?? null,
      descriptionSnapshot: line.description,
      skuSnapshot: line.sku ?? null,
      categoryNameSnapshot: line.categoryName ?? 'manual',
      sourceType: line.sourceType ?? null,
      sourceId: line.sourceId ?? null,
    };
  }

  private mergeRepairOrderId(current: number | null, next: number) {
    if (!current) {
      return next;
    }
    if (Number(current) !== Number(next)) {
      throw new AppError(409, 'STATE_CONFLICT', 'All repair lines in one invoice must belong to the same repair order');
    }
    return current;
  }

  private mergeProjectId(current: number | null, next: number) {
    if (!current) {
      return next;
    }
    if (Number(current) !== Number(next)) {
      throw new AppError(409, 'STATE_CONFLICT', 'All project lines in one invoice must belong to the same project');
    }
    return current;
  }
}
