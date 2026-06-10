import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
import type {
  InvoiceDocumentType,
  InvoiceLineType,
  InvoiceStatus,
  InvoiceUpdateInput,
} from './sales.schemas.js';

type InvoiceHeaderRow = RowDataPacket & {
  id: number;
  invoice_code: string;
  customer_id: number | null;
  repair_order_id: number | null;
  customer_code: string | null;
  customer_name: string | null;
  is_walk_in: number;
  document_type: InvoiceDocumentType;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  created_at: string;
  approved_at: string | null;
  voided_at: string | null;
  note_text: string | null;
  a4_header_text: string | null;
  a4_footer_text: string | null;
  receipt_header_text: string | null;
  receipt_footer_text: string | null;
};

type InvoiceListRow = InvoiceHeaderRow & {
  line_count: number;
};

type InvoiceLineRow = RowDataPacket & {
  id: number;
  invoice_id: number;
  line_type: InvoiceLineType;
  product_id: number | null;
  description_snapshot: string | null;
  sku_snapshot: string | null;
  category_name_snapshot: string | null;
  quantity: string;
  unit_price: string;
  unit_cost: string | null;
  reservation_id: number | null;
  repair_order_service_id: number | null;
  repair_order_part_id: number | null;
  source_type: string | null;
  source_id: number | null;
  line_total: string;
  product_name: string;
  product_sku: string;
  category_name: string;
};

type RawInvoiceLineRow = RowDataPacket & {
  id: number;
  invoice_id: number;
  line_type: InvoiceLineType;
  product_id: number | null;
  description_snapshot: string | null;
  sku_snapshot: string | null;
  category_name_snapshot: string | null;
  quantity: string;
  unit_price: string;
  unit_cost: string | null;
  reservation_id: number | null;
  repair_order_service_id: number | null;
  repair_order_part_id: number | null;
  source_type: string | null;
  source_id: number | null;
  line_total: string;
};

type ProductPricingRow = RowDataPacket & {
  id: number;
  sku: string;
  default_name: string;
  current_purchase_price: string;
  current_sale_price: string;
  category_name: string;
};

type RepairOrderHeaderRow = RowDataPacket & {
  id: number;
  order_code: string;
  customer_id: number;
  customer_name: string;
  customer_code: string | null;
  device_id: number;
  device_name: string;
  status: string;
};

type RepairServiceBillableRow = RowDataPacket & {
  id: number;
  repair_order_id: number;
  service_name_snapshot: string;
  quantity: string;
  unit_price_snapshot: string;
  sales_invoice_id: number | null;
};

type RepairPartBillableRow = RowDataPacket & {
  id: number;
  repair_order_id: number;
  product_id: number;
  product_name_snapshot: string;
  quantity: string;
  unit_cost_snapshot: string;
  reservation_id: number;
  sales_invoice_id: number | null;
  product_sku: string;
  current_sale_price: string;
  category_name: string;
  reservation_status: 'active' | 'consumed' | 'released' | 'cancelled' | null;
};

type FinanceMethodLockRow = RowDataPacket & {
  id: number;
  linked_account_id: number | null;
};

type BalanceLockRow = RowDataPacket & {
  product_id: number;
  quantity_on_hand: string;
  quantity_reserved: string;
};

type ReservationRow = RowDataPacket & {
  id: number;
  product_id: number;
  quantity: string;
  status: 'active' | 'consumed' | 'released' | 'cancelled';
  source_type: string;
  source_id: number;
};

type RepairServiceLockRow = RowDataPacket & {
  id: number;
  repair_order_id: number;
  quantity: string;
  sales_invoice_id: number | null;
};

type RepairPartLockRow = RowDataPacket & {
  id: number;
  repair_order_id: number;
  product_id: number;
  quantity: string;
  reservation_id: number;
  sales_invoice_id: number | null;
};

export type InvoiceInsertLine = {
  lineType: InvoiceLineType;
  productId?: number | null;
  descriptionSnapshot?: string | null;
  skuSnapshot?: string | null;
  categoryNameSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost?: number | null;
  reservationId?: number | null;
  repairOrderServiceId?: number | null;
  repairOrderPartId?: number | null;
  sourceType?: string | null;
  sourceId?: number | null;
};

function generateDocumentCode(documentType: InvoiceDocumentType) {
  const prefix = documentType === 'quote' ? 'SQTE' : 'SINV';
  const randomSuffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}-${Date.now()}-${randomSuffix}`;
}

function nullable(value: string | number | null | undefined) {
  return value === undefined ? null : value;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameQuantity(left: string | number, right: string | number) {
  return Math.abs(toNumber(left) - toNumber(right)) < 0.000001;
}

export class SalesRepository {
  async createInvoice(input: {
    customerId?: number | null;
    repairOrderId?: number | null;
    isWalkIn?: boolean;
    documentType: InvoiceDocumentType;
    noteText?: string | null;
    a4HeaderText?: string | null;
    a4FooterText?: string | null;
    receiptHeaderText?: string | null;
    receiptFooterText?: string | null;
    createdBy: number;
  }) {
    const code = generateDocumentCode(input.documentType);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sales_invoices (
         invoice_code,
         customer_id,
         repair_order_id,
         is_walk_in,
         document_type,
         note_text,
         a4_header_text,
         a4_footer_text,
         receipt_header_text,
         receipt_footer_text,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        input.customerId ?? null,
        input.repairOrderId ?? null,
        !!input.isWalkIn,
        input.documentType,
        nullable(input.noteText),
        nullable(input.a4HeaderText),
        nullable(input.a4FooterText),
        nullable(input.receiptHeaderText),
        nullable(input.receiptFooterText),
        input.createdBy,
      ],
    );

    return { id: result.insertId, invoice_code: code };
  }

  async addLine(invoiceId: number, line: InvoiceInsertLine) {
    const lineTotal = Number((line.quantity * line.unitPrice).toFixed(4));
    await pool.execute<ResultSetHeader>(
      `INSERT INTO sales_invoice_lines (
         invoice_id,
         line_type,
         product_id,
         description_snapshot,
         sku_snapshot,
         category_name_snapshot,
         quantity,
         unit_price,
         unit_cost,
         reservation_id,
         repair_order_service_id,
         repair_order_part_id,
         source_type,
         source_id,
         line_total
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        line.lineType,
        line.productId ?? null,
        nullable(line.descriptionSnapshot),
        nullable(line.skuSnapshot),
        nullable(line.categoryNameSnapshot),
        line.quantity,
        line.unitPrice,
        line.unitCost ?? null,
        line.reservationId ?? null,
        line.repairOrderServiceId ?? null,
        line.repairOrderPartId ?? null,
        nullable(line.sourceType),
        line.sourceId ?? null,
        lineTotal,
      ],
    );
  }

  async recalculateInvoiceTotals(invoiceId: number) {
    await pool.execute(
      `UPDATE sales_invoices
       SET subtotal = (
             SELECT COALESCE(SUM(line_total), 0)
             FROM sales_invoice_lines
             WHERE invoice_id = ?
           ),
           total = (
             SELECT COALESCE(SUM(line_total), 0)
             FROM sales_invoice_lines
             WHERE invoice_id = ?
           ) + COALESCE(tax, 0)
       WHERE id = ?`,
      [invoiceId, invoiceId, invoiceId],
    );
    return this.getInvoiceById(invoiceId);
  }

  async getInvoiceById(id: number) {
    const [rows] = await pool.execute<InvoiceHeaderRow[]>(
      `SELECT
         i.*,
         c.customer_code,
         c.name AS customer_name
       FROM sales_invoices i
       LEFT JOIN crm_customers c ON c.id = i.customer_id
       WHERE i.id = ?
       LIMIT 1`,
      [id],
    );
    const invoice = rows[0];
    if (!invoice) {
      return null;
    }

    const [lines] = await pool.execute<InvoiceLineRow[]>(
      `SELECT
         l.*,
         COALESCE(l.description_snapshot, p.default_name, '') AS product_name,
         COALESCE(l.sku_snapshot, p.sku, '') AS product_sku,
         COALESCE(l.category_name_snapshot, cat.default_name, '') AS category_name
       FROM sales_invoice_lines l
       LEFT JOIN catalog_products p ON p.id = l.product_id
       LEFT JOIN catalog_categories cat ON cat.id = p.category_id
       WHERE l.invoice_id = ?
       ORDER BY l.id`,
      [id],
    );

    return { ...invoice, lines };
  }

  async listInvoices(params: {
    offset?: number;
    limit?: number;
    search?: string;
    documentType?: InvoiceDocumentType;
    status?: InvoiceStatus;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    const conditions = ['1 = 1'];
    const values: Array<string | number> = [];

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push('(i.invoice_code LIKE ? OR c.name LIKE ? OR c.customer_code LIKE ?)');
      values.push(term, term, term);
    }

    if (params.documentType) {
      conditions.push('i.document_type = ?');
      values.push(params.documentType);
    }

    if (params.status) {
      conditions.push('i.status = ?');
      values.push(params.status);
    }

    if (params.dateFrom) {
      conditions.push('DATE(i.created_at) >= ?');
      values.push(params.dateFrom);
    }

    if (params.dateTo) {
      conditions.push('DATE(i.created_at) <= ?');
      values.push(params.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    const [countRows] = await pool.execute<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total
       FROM sales_invoices i
       LEFT JOIN crm_customers c ON c.id = i.customer_id
       WHERE ${whereClause}`,
      values,
    );

    const [rows] = await pool.execute<InvoiceListRow[]>(
      `SELECT
         i.*,
         c.customer_code,
         c.name AS customer_name,
         (
           SELECT COUNT(*)
           FROM sales_invoice_lines l
           WHERE l.invoice_id = i.id
         ) AS line_count
       FROM sales_invoices i
       LEFT JOIN crm_customers c ON c.id = i.customer_id
       WHERE ${whereClause}
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );

    return {
      items: rows,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async updateInvoicePrintContent(id: number, input: InvoiceUpdateInput) {
    await pool.execute(
      `UPDATE sales_invoices
       SET note_text = COALESCE(?, note_text),
           a4_header_text = COALESCE(?, a4_header_text),
           a4_footer_text = COALESCE(?, a4_footer_text),
           receipt_header_text = COALESCE(?, receipt_header_text),
           receipt_footer_text = COALESCE(?, receipt_footer_text)
       WHERE id = ?`,
      [
        nullable(input.noteText),
        nullable(input.a4HeaderText),
        nullable(input.a4FooterText),
        nullable(input.receiptHeaderText),
        nullable(input.receiptFooterText),
        id,
      ],
    );
    return this.getInvoiceById(id);
  }

  async findProductPricing(productId: number) {
    const [rows] = await pool.execute<ProductPricingRow[]>(
      `SELECT
         p.id,
         p.sku,
         p.default_name,
         p.current_purchase_price,
         p.current_sale_price,
         c.default_name AS category_name
       FROM catalog_products p
       INNER JOIN catalog_categories c ON c.id = p.category_id
       WHERE p.id = ?
       LIMIT 1`,
      [productId],
    );
    return rows[0] ?? null;
  }

  async getRepairOrderHeader(orderId: number) {
    const [rows] = await pool.execute<RepairOrderHeaderRow[]>(
      `SELECT
         o.id,
         o.order_code,
         o.customer_id,
         c.name AS customer_name,
         c.customer_code,
         o.device_id,
         d.device_name,
         o.status
       FROM repair_orders o
       INNER JOIN crm_customers c ON c.id = o.customer_id
       INNER JOIN repair_devices d ON d.id = o.device_id
       WHERE o.id = ?
       LIMIT 1`,
      [orderId],
    );
    return rows[0] ?? null;
  }

  async findRepairServiceBillable(repairOrderServiceId: number) {
    const [rows] = await pool.execute<RepairServiceBillableRow[]>(
      `SELECT
         s.id,
         s.repair_order_id,
         s.service_name_snapshot,
         s.quantity,
         s.unit_price_snapshot,
         s.sales_invoice_id
       FROM repair_order_services s
       WHERE s.id = ?
       LIMIT 1`,
      [repairOrderServiceId],
    );
    return rows[0] ?? null;
  }

  async findRepairPartBillable(repairOrderPartId: number) {
    const [rows] = await pool.execute<RepairPartBillableRow[]>(
      `SELECT
         p.id,
         p.repair_order_id,
         p.product_id,
         p.product_name_snapshot,
         p.quantity,
         p.unit_cost_snapshot,
         p.reservation_id,
         p.sales_invoice_id,
         cp.sku AS product_sku,
         cp.current_sale_price,
         cc.default_name AS category_name,
         r.status AS reservation_status
       FROM repair_order_parts p
       INNER JOIN catalog_products cp ON cp.id = p.product_id
       INNER JOIN catalog_categories cc ON cc.id = cp.category_id
       LEFT JOIN inventory_stock_reservations r ON r.id = p.reservation_id
       WHERE p.id = ?
       LIMIT 1`,
      [repairOrderPartId],
    );
    return rows[0] ?? null;
  }

  async approveInvoice(
    id: number,
    approverId: number,
    payment?: {
      paymentAccountId?: number | null;
      paymentMethodId?: number | null;
      paymentAmount?: number | null;
      paymentReference?: string | null;
    },
  ) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const invoice = await this.lockInvoice(connection, id);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
      }
      if (invoice.document_type !== 'invoice') {
        throw new AppError(409, 'STATE_CONFLICT', 'Price statements cannot be approved as invoices');
      }
      if (invoice.status !== 'draft') {
        throw new AppError(409, 'STATE_CONFLICT', 'Only draft invoices can be approved');
      }

      const lines = await this.lockInvoiceLines(connection, id);
      const productLines = lines.filter((line) => line.line_type === 'product');
      if (productLines.length > 0) {
        await this.consumeStandardProductLines(connection, invoice, productLines, approverId);
      }

      for (const line of lines.filter((entry) => entry.line_type === 'repair_part')) {
        await this.consumeRepairPartLine(connection, invoice, line, approverId);
      }

      for (const line of lines.filter((entry) => entry.line_type === 'repair_service')) {
        await this.markRepairServiceLineBilled(connection, invoice, line);
      }

      await connection.execute(
        `UPDATE sales_invoices
         SET status = 'approved', approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [approverId, id],
      );

      await this.recordFinancePayment(connection, invoice, approverId, payment);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return this.getInvoiceById(id);
  }

  private async recordFinancePayment(
    connection: PoolConnection,
    invoice: InvoiceHeaderRow,
    actorUserId: number,
    payment?: {
      paymentAccountId?: number | null;
      paymentMethodId?: number | null;
      paymentAmount?: number | null;
      paymentReference?: string | null;
    },
  ) {
    if (!payment || (!payment.paymentAccountId && !payment.paymentMethodId)) {
      return;
    }

    const amount = Number(payment.paymentAmount ?? invoice.total ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Payment amount must be greater than zero');
    }

    const paymentMethodId = payment.paymentMethodId ?? null;
    const paymentAccountId = await this.resolveFinanceAccountId(connection, payment.paymentAccountId ?? null, paymentMethodId);
    if (!paymentAccountId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Select a payment account or link the payment method to an account');
    }

    await connection.execute(
      `INSERT INTO finance_transactions (
         transaction_code,
         account_id,
         payment_method_id,
         amount,
         currency,
         direction,
         operation_type,
         reference_type,
         reference_id,
         counterparty_name,
         external_reference,
         notes,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, 'EGP', 'in', 'sale_payment', 'sales_invoice', ?, ?, ?, ?, ?)`,
      [
        `FTX-${Date.now()}-${invoice.id}`,
        paymentAccountId,
        paymentMethodId,
        amount,
        invoice.id,
        invoice.customer_name ?? invoice.customer_code ?? 'Walk-in customer',
        payment.paymentReference ?? invoice.invoice_code,
        `Payment for ${invoice.invoice_code}`,
        actorUserId,
      ],
    );
  }

  private async resolveFinanceAccountId(connection: PoolConnection, accountId: number | null, methodId: number | null) {
    if (accountId) {
      await this.assertFinanceAccountExists(connection, accountId);
      return accountId;
    }

    if (!methodId) {
      return null;
    }

    const [rows] = await connection.execute<FinanceMethodLockRow[]>(
      `SELECT id, linked_account_id
       FROM finance_payment_methods
       WHERE id = ?
       LIMIT 1`,
      [methodId],
    );
    const method = rows[0];
    if (!method) {
      throw new AppError(404, 'NOT_FOUND', 'Payment method not found');
    }
    if (method.linked_account_id) {
      await this.assertFinanceAccountExists(connection, Number(method.linked_account_id));
    }
    return Number(method.linked_account_id ?? 0) || null;
  }

  private async assertFinanceAccountExists(connection: PoolConnection, accountId: number) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM finance_payment_accounts
       WHERE id = ?
       LIMIT 1`,
      [accountId],
    );
    if (!rows.length) {
      throw new AppError(404, 'NOT_FOUND', 'Payment account not found');
    }
  }

  async markVoided(id: number, voiderId: number) {
    const current = await this.getInvoiceById(id);
    if (!current) {
      throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
    }
    if (current.status !== 'draft') {
      throw new AppError(409, 'STATE_CONFLICT', 'Only draft documents can be voided');
    }

    await pool.execute(
      `UPDATE sales_invoices
       SET status = 'voided', voided_by_user_id = ?, voided_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [voiderId, id],
    );
    return this.getInvoiceById(id);
  }

  async createReturn(payload: { invoiceId: number; createdBy: number }) {
    const code = `SRET-${Date.now()}`;
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sales_returns (return_code, invoice_id, created_by_user_id)
       VALUES (?, ?, ?)`,
      [code, payload.invoiceId, payload.createdBy],
    );
    return { id: result.insertId, return_code: code };
  }

  async addReturnLine(returnId: number, line: { productId: number; quantity: number; unitPrice?: number; unitCost?: number }) {
    const lineTotal = line.unitPrice ? Number((line.quantity * line.unitPrice).toFixed(2)) : null;
    await pool.execute(
      `INSERT INTO sales_return_lines (return_id, product_id, quantity, unit_price, unit_cost, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [returnId, line.productId, line.quantity, line.unitPrice ?? null, line.unitCost ?? null, lineTotal],
    );
    return this.getReturnById(returnId);
  }

  async getReturnById(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM sales_returns WHERE id = ?',
      [id],
    );
    const record = rows[0];
    if (!record) {
      return null;
    }
    const [lines] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM sales_return_lines WHERE return_id = ? ORDER BY id',
      [id],
    );
    return { ...record, lines };
  }

  private async consumeStandardProductLines(
    connection: PoolConnection,
    invoice: InvoiceHeaderRow,
    lines: RawInvoiceLineRow[],
    actorUserId: number,
  ) {
    for (const line of lines) {
      if (!line.product_id) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Product line is missing a product id');
      }
      const balance = await this.lockBalance(connection, line.product_id);
      const available = toNumber(balance.quantity_on_hand) - toNumber(balance.quantity_reserved);
      if (toNumber(line.quantity) > available) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', 'Cannot approve invoice with insufficient stock', {
          productId: line.product_id,
          available,
        });
      }
    }

    const [adjustmentResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO inventory_adjustments (reason, notes, created_by_user_id)
       VALUES (?, ?, ?)`,
      [`Invoice ${invoice.invoice_code} sale`, null, actorUserId],
    );
    const adjustmentId = adjustmentResult.insertId;

    for (const line of lines) {
      const productId = Number(line.product_id);
      await connection.execute(
        `INSERT INTO inventory_adjustment_lines (
           adjustment_id, product_id, direction, quantity, unit_cost, notes
         )
         VALUES (?, ?, 'out', ?, ?, ?)`,
        [
          adjustmentId,
          productId,
          line.quantity,
          nullable(line.unit_cost),
          `Invoice ${invoice.invoice_code} sale`,
        ],
      );
      await connection.execute(
        `UPDATE inventory_stock_balances
         SET quantity_on_hand = quantity_on_hand - ?
         WHERE product_id = ?`,
        [line.quantity, productId],
      );
      await this.insertInventoryMovement(connection, {
        productId,
        movementType: 'adjustment_out',
        quantity: toNumber(line.quantity),
        unitCost: nullable(line.unit_cost),
        sourceType: 'stock_adjustment',
        sourceId: adjustmentId,
        note: `Invoice ${invoice.invoice_code} sale`,
        actorUserId,
      });
    }
  }

  private async consumeRepairPartLine(
    connection: PoolConnection,
    invoice: InvoiceHeaderRow,
    line: RawInvoiceLineRow,
    actorUserId: number,
  ) {
    if (!line.product_id || !line.repair_order_part_id || !line.reservation_id) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Repair part line is incomplete');
    }
    const part = await this.lockRepairPart(connection, line.repair_order_part_id);
    if (part.sales_invoice_id && Number(part.sales_invoice_id) !== invoice.id) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair part has already been billed');
    }
    if (invoice.repair_order_id && Number(part.repair_order_id) !== Number(invoice.repair_order_id)) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair part does not belong to the selected repair order');
    }
    if (!sameQuantity(part.quantity, line.quantity)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Repair part quantity must match the reserved quantity');
    }

    const reservation = await this.lockReservation(connection, line.reservation_id);
    if (reservation.status !== 'active') {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair reservation is no longer active');
    }
    if (Number(reservation.product_id) !== Number(line.product_id) || Number(part.product_id) !== Number(line.product_id)) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair reservation product does not match the invoice line');
    }
    if (!sameQuantity(reservation.quantity, line.quantity)) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair reservation quantity does not match the invoice line');
    }

    await this.lockBalance(connection, reservation.product_id);
    await connection.execute(
      `UPDATE inventory_stock_balances
       SET quantity_on_hand = quantity_on_hand - ?,
           quantity_reserved = quantity_reserved - ?
       WHERE product_id = ?`,
      [reservation.quantity, reservation.quantity, reservation.product_id],
    );
    await this.insertInventoryMovement(connection, {
      productId: reservation.product_id,
      movementType: 'reservation_consume',
      quantity: toNumber(reservation.quantity),
      unitCost: null,
      sourceType: 'stock_reservation',
      sourceId: reservation.id,
      note: `Repair part consumed by invoice ${invoice.invoice_code}`,
      actorUserId,
    });
    await connection.execute(
      `UPDATE inventory_stock_reservations
       SET status = 'consumed', consumed_by_user_id = ?, consumed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [actorUserId, reservation.id],
    );
    await connection.execute(
      `UPDATE repair_order_parts
       SET sales_invoice_id = ?, billed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND (sales_invoice_id IS NULL OR sales_invoice_id = ?)`,
      [invoice.id, part.id, invoice.id],
    );
  }

  private async markRepairServiceLineBilled(
    connection: PoolConnection,
    invoice: InvoiceHeaderRow,
    line: RawInvoiceLineRow,
  ) {
    if (!line.repair_order_service_id) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Repair service line is incomplete');
    }
    const service = await this.lockRepairService(connection, line.repair_order_service_id);
    if (service.sales_invoice_id && Number(service.sales_invoice_id) !== invoice.id) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair service has already been billed');
    }
    if (invoice.repair_order_id && Number(service.repair_order_id) !== Number(invoice.repair_order_id)) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair service does not belong to the selected repair order');
    }
    if (!sameQuantity(service.quantity, line.quantity)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Repair service quantity must match the repair order');
    }
    await connection.execute(
      `UPDATE repair_order_services
       SET sales_invoice_id = ?, billed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND (sales_invoice_id IS NULL OR sales_invoice_id = ?)`,
      [invoice.id, service.id, invoice.id],
    );
  }

  private async lockInvoice(connection: PoolConnection, id: number) {
    const [rows] = await connection.execute<InvoiceHeaderRow[]>(
      `SELECT *
       FROM sales_invoices
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async lockInvoiceLines(connection: PoolConnection, invoiceId: number) {
    const [rows] = await connection.execute<RawInvoiceLineRow[]>(
      `SELECT *
       FROM sales_invoice_lines
       WHERE invoice_id = ?
       ORDER BY id
       FOR UPDATE`,
      [invoiceId],
    );
    return rows;
  }

  private async lockBalance(connection: PoolConnection, productId: number) {
    await connection.execute('INSERT IGNORE INTO inventory_stock_balances (product_id) VALUES (?)', [productId]);
    await connection.execute(
      'SELECT product_id FROM inventory_stock_balances WHERE product_id = ? FOR UPDATE',
      [productId],
    );
    await connection.execute(
      `UPDATE inventory_stock_balances b
       SET quantity_reserved = COALESCE((
         SELECT SUM(r.quantity)
         FROM inventory_stock_reservations r
         WHERE r.product_id = b.product_id AND r.status = 'active'
       ), 0)
       WHERE b.product_id = ?`,
      [productId],
    );
    const [rows] = await connection.execute<BalanceLockRow[]>(
      'SELECT * FROM inventory_stock_balances WHERE product_id = ?',
      [productId],
    );
    const balance = rows[0];
    if (!balance) {
      throw new AppError(404, 'NOT_FOUND', 'Stock balance not found');
    }
    return balance;
  }

  private async lockReservation(connection: PoolConnection, reservationId: number) {
    const [rows] = await connection.execute<ReservationRow[]>(
      'SELECT * FROM inventory_stock_reservations WHERE id = ? FOR UPDATE',
      [reservationId],
    );
    const reservation = rows[0];
    if (!reservation) {
      throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    }
    return reservation;
  }

  private async lockRepairService(connection: PoolConnection, repairOrderServiceId: number) {
    const [rows] = await connection.execute<RepairServiceLockRow[]>(
      'SELECT * FROM repair_order_services WHERE id = ? FOR UPDATE',
      [repairOrderServiceId],
    );
    const service = rows[0];
    if (!service) {
      throw new AppError(404, 'NOT_FOUND', 'Repair service not found');
    }
    return service;
  }

  private async lockRepairPart(connection: PoolConnection, repairOrderPartId: number) {
    const [rows] = await connection.execute<RepairPartLockRow[]>(
      'SELECT * FROM repair_order_parts WHERE id = ? FOR UPDATE',
      [repairOrderPartId],
    );
    const part = rows[0];
    if (!part) {
      throw new AppError(404, 'NOT_FOUND', 'Repair part not found');
    }
    return part;
  }

  private async insertInventoryMovement(
    connection: PoolConnection,
    params: {
      productId: number;
      movementType: 'adjustment_out' | 'reservation_consume';
      quantity: number;
      unitCost: string | number | null;
      sourceType: string;
      sourceId: number;
      note: string | null;
      actorUserId: number;
    },
  ) {
    await connection.execute(
      `INSERT INTO inventory_stock_movements (
         product_id, movement_type, quantity, unit_cost, source_type, source_id, note, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.productId,
        params.movementType,
        params.quantity,
        nullable(params.unitCost),
        params.sourceType,
        params.sourceId,
        nullable(params.note),
        params.actorUserId,
      ],
    );
  }
}
