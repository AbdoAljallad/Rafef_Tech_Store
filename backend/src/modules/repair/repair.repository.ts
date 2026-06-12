import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
import type {
  BrandInput,
  DeviceCategoryInput,
  DeviceInput,
  ModelInput,
  NoteInput,
  OrderInput,
  OrderPartInput,
  OrderServiceInput,
  RepairStatus,
  StatusChangeInput,
} from './repair.schemas.js';

type RepairOrderHeaderRow = RowDataPacket & {
  id: number;
  order_code: string;
  customer_id: number;
  customer_name: string;
  customer_code: string | null;
  device_id: number;
  device_name: string;
  device_category_name: string | null;
  device_brand_name: string | null;
  device_model_name: string | null;
  status: RepairStatus;
  problem_description: string;
  intake_notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_user_id: number | null;
};

type RepairDeviceRow = RowDataPacket & {
  id: number;
  customer_id: number;
  category_id: number;
  brand_id: number | null;
  model_id: number | null;
  device_name: string;
  serial_no: string | null;
  imei: string | null;
  notes: string | null;
  created_at: string;
  category_name_ru?: string | null;
  brand_name?: string | null;
  model_name?: string | null;
};

type RepairServiceRow = RowDataPacket & {
  id: number;
  repair_order_id: number;
  service_id: number | null;
  service_name_snapshot: string;
  quantity: string;
  unit_price_snapshot: string;
  sales_invoice_id: number | null;
  billed_at: string | null;
};

type RepairPartRow = RowDataPacket & {
  id: number;
  repair_order_id: number;
  product_id: number;
  product_name_snapshot: string;
  quantity: string;
  unit_cost_snapshot: string;
  reservation_id: number;
  sales_invoice_id: number | null;
  billed_at: string | null;
  product_sku?: string | null;
  current_sale_price?: string | null;
  reservation_status?: string | null;
};

type RepairOrderLockRow = RowDataPacket & {
  id: number;
  status: RepairStatus;
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
  reservation_id: number | null;
  sales_invoice_id: number | null;
};

type ReservationRow = RowDataPacket & {
  id: number;
  product_id: number;
  quantity: string;
  status: 'active' | 'consumed' | 'released' | 'cancelled';
};

type BalanceLockRow = RowDataPacket & {
  product_id: number;
  quantity_on_hand: string;
  quantity_reserved: string;
};

type LinkedSalesDocumentRow = RowDataPacket & {
  id: number;
  invoice_code: string | null;
  document_type: string | null;
  status: string | null;
};

type ReleasedReservationInfo = {
  reservationId: number;
  productId: number;
  quantity: number;
  status: 'released';
};

function nullable(value: string | number | null | undefined) {
  return value === undefined ? null : value;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class RepairRepository {
  listCategories() {
    return pool
      .query<RowDataPacket[]>('SELECT * FROM repair_device_categories WHERE is_active = TRUE ORDER BY name_ru')
      .then(([rows]) => rows);
  }

  listBrands() {
    return pool
      .query<RowDataPacket[]>('SELECT * FROM repair_device_brands WHERE is_active = TRUE ORDER BY name')
      .then(([rows]) => rows);
  }

  async listModels() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, c.name_ru AS category_name_ru, b.name AS brand_name
       FROM repair_device_models m
       INNER JOIN repair_device_categories c ON c.id = m.category_id
       INNER JOIN repair_device_brands b ON b.id = m.brand_id
       WHERE m.is_active = TRUE
       ORDER BY b.name, m.name`,
    );
    return rows;
  }

  async listCustomerDevices(customerId: number) {
    await this.requireCustomer(customerId);
    const [rows] = await pool.execute<RepairDeviceRow[]>(
      `SELECT
         d.*,
         c.name_ru AS category_name_ru,
         b.name AS brand_name,
         m.name AS model_name
       FROM repair_devices d
       INNER JOIN repair_device_categories c ON c.id = d.category_id
       LEFT JOIN repair_device_brands b ON b.id = d.brand_id
       LEFT JOIN repair_device_models m ON m.id = d.model_id
       WHERE d.customer_id = ?
       ORDER BY d.created_at DESC, d.id DESC`,
      [customerId],
    );
    return rows;
  }

  async createCategory(input: DeviceCategoryInput) {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO repair_device_categories (code, name_ru) VALUES (?, ?)',
      [input.code, input.nameRu],
    );
    return { id: result.insertId, ...input };
  }

  async createBrand(input: BrandInput) {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO repair_device_brands (name) VALUES (?)',
      [input.name],
    );
    return { id: result.insertId, ...input };
  }

  async createModel(input: ModelInput) {
    await this.requireCategory(input.categoryId);
    await this.requireBrand(input.brandId);
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO repair_device_models (category_id, brand_id, name) VALUES (?, ?, ?)',
      [input.categoryId, input.brandId, input.name],
    );
    return { id: result.insertId, ...input };
  }

  async createDevice(input: DeviceInput) {
    await this.requireCustomer(input.customerId);
    await this.requireCategory(input.categoryId);
    if (input.brandId) {
      await this.requireBrand(input.brandId);
    }
    if (input.modelId) {
      await this.requireModel(input.modelId);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO repair_devices (
         customer_id, category_id, brand_id, model_id, device_name, serial_no, imei, notes
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.customerId,
        input.categoryId,
        nullable(input.brandId),
        nullable(input.modelId),
        input.deviceName,
        nullable(input.serialNo),
        nullable(input.imei),
        nullable(input.notes),
      ],
    );

    return this.findDevice(result.insertId);
  }

  async listOrders(params: { offset: number; limit: number }) {
    const [rows] = await pool.execute<RepairOrderHeaderRow[]>(
      `SELECT
         o.*,
         c.name AS customer_name,
         c.customer_code,
         d.device_name,
         dc.name_ru AS device_category_name,
         db.name AS device_brand_name,
         dm.name AS device_model_name
       FROM repair_orders o
       INNER JOIN crm_customers c ON c.id = o.customer_id
       INNER JOIN repair_devices d ON d.id = o.device_id
       INNER JOIN repair_device_categories dc ON dc.id = d.category_id
       LEFT JOIN repair_device_brands db ON db.id = d.brand_id
       LEFT JOIN repair_device_models dm ON dm.id = d.model_id
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT ${params.limit} OFFSET ${params.offset}`,
    );
    return rows;
  }

  async createOrder(input: OrderInput, userId: number) {
    if (!input.deviceId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Device is required');
    }

    await this.requireCustomer(input.customerId);
    const device = await this.findDevice(input.deviceId);
    if (!device) {
      throw new AppError(404, 'NOT_FOUND', 'Device not found');
    }
    if (Number(device.customer_id) !== input.customerId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Device must belong to customer');
    }

    const temporaryCode = `REP-TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO repair_orders (
         order_code, customer_id, device_id, problem_description, intake_notes, assigned_user_id, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        temporaryCode,
        input.customerId,
        input.deviceId,
        input.problemDescription,
        nullable(input.intakeNotes),
        nullable(input.assignedUserId),
        userId,
      ],
    );
    await pool.execute('UPDATE repair_orders SET order_code = ? WHERE id = ?', [
      this.formatOrderCode(result.insertId),
      result.insertId,
    ]);
    await this.insertStatusHistory(pool, result.insertId, null, 'new', 'Order created', userId);
    return this.findOrder(result.insertId);
  }

  async findOrder(id: number) {
    const order = await this.findOrderHeader(id);
    if (!order) {
      return null;
    }

    const [services] = await pool.execute<RepairServiceRow[]>(
      `SELECT *
       FROM repair_order_services
       WHERE repair_order_id = ?
       ORDER BY id`,
      [id],
    );
    const [parts] = await pool.execute<RepairPartRow[]>(
      `SELECT
         p.*,
         cp.sku AS product_sku,
         cp.current_sale_price,
         r.status AS reservation_status
       FROM repair_order_parts p
       LEFT JOIN catalog_products cp ON cp.id = p.product_id
       LEFT JOIN inventory_stock_reservations r ON r.id = p.reservation_id
       WHERE p.repair_order_id = ?
       ORDER BY p.id`,
      [id],
    );
    const [notes] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM repair_order_notes
       WHERE repair_order_id = ?
       ORDER BY id`,
      [id],
    );
    const [history] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM repair_order_status_history
       WHERE repair_order_id = ?
       ORDER BY id`,
      [id],
    );

    return { ...order, services, parts, notes, history };
  }

  async getOrderBilling(orderId: number) {
    const order = await this.findOrderHeader(orderId);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
    }
    if (order.status === 'cancelled') {
      return { order, services: [], parts: [] };
    }

    const [services] = await pool.execute<RowDataPacket[]>(
      `SELECT
         s.id AS repair_order_service_id,
         s.repair_order_id,
         s.service_name_snapshot,
         s.quantity,
         s.unit_price_snapshot,
         CAST(s.quantity * s.unit_price_snapshot AS DECIMAL(19,4)) AS line_total
       FROM repair_order_services s
       WHERE s.repair_order_id = ? AND s.sales_invoice_id IS NULL
       ORDER BY s.id`,
      [orderId],
    );
    const [parts] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.id AS repair_order_part_id,
         p.repair_order_id,
         p.product_id,
         p.product_name_snapshot,
         p.quantity,
         p.unit_cost_snapshot,
         p.reservation_id,
         cp.sku AS product_sku,
         cp.current_sale_price,
         cc.default_name AS category_name,
         r.status AS reservation_status,
         CAST(p.quantity * COALESCE(cp.current_sale_price, 0) AS DECIMAL(19,4)) AS line_total
       FROM repair_order_parts p
       INNER JOIN catalog_products cp ON cp.id = p.product_id
       INNER JOIN catalog_categories cc ON cc.id = cp.category_id
       LEFT JOIN inventory_stock_reservations r ON r.id = p.reservation_id
       WHERE p.repair_order_id = ? AND p.sales_invoice_id IS NULL
       ORDER BY p.id`,
      [orderId],
    );

    return { order, services, parts };
  }

  async addService(orderId: number, input: OrderServiceInput) {
    await this.requireOrder(orderId);

    let serviceName = input.serviceName;
    let unitPrice = input.unitPrice ?? 0;

    if (input.serviceId) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT default_name, default_price FROM catalog_services WHERE id = ? AND is_active = TRUE',
        [input.serviceId],
      );
      const service = rows[0];
      if (!service) {
        throw new AppError(404, 'NOT_FOUND', 'Service not found');
      }
      serviceName = serviceName ?? String(service.default_name);
      unitPrice = input.unitPrice ?? Number(service.default_price);
    }

    if (!serviceName) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Service name is required');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO repair_order_services (
         repair_order_id, service_id, service_name_snapshot, quantity, unit_price_snapshot
       )
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, nullable(input.serviceId), serviceName, input.quantity, unitPrice],
    );

    return {
      id: result.insertId,
      repairOrderId: orderId,
      serviceName,
      quantity: input.quantity,
      unitPrice,
    };
  }

  async addPart(orderId: number, input: OrderPartInput, reservationId: number) {
    await this.requireOrder(orderId);
    const product = await this.requireProduct(input.productId);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO repair_order_parts (
         repair_order_id, product_id, product_name_snapshot, quantity, unit_cost_snapshot, reservation_id
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        input.productId,
        product.default_name,
        input.quantity,
        product.current_purchase_price,
        reservationId,
      ],
    );
    return {
      id: result.insertId,
      repairOrderId: orderId,
      reservationId,
      productId: input.productId,
      quantity: input.quantity,
    };
  }

  async removeService(orderId: number, serviceId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.lockOrder(connection, orderId);
      const service = await this.lockRepairService(connection, serviceId);
      if (Number(service.repair_order_id) !== Number(orderId)) {
        throw new AppError(404, 'NOT_FOUND', 'Repair service not found');
      }
      if (service.sales_invoice_id) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair service has already been billed');
      }

      await connection.execute('DELETE FROM repair_order_services WHERE id = ?', [serviceId]);
      await connection.commit();
      return service;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async removePart(orderId: number, partId: number, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.lockOrder(connection, orderId);
      const part = await this.lockRepairPart(connection, partId);
      if (Number(part.repair_order_id) !== Number(orderId)) {
        throw new AppError(404, 'NOT_FOUND', 'Repair part not found');
      }
      if (part.sales_invoice_id) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair part has already been billed');
      }

      const releasedReservation = await this.releasePartReservationIfNeeded(connection, part, actorUserId);
      await connection.execute('DELETE FROM repair_order_parts WHERE id = ?', [partId]);
      await connection.commit();
      return {
        part,
        releasedReservation,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateService(orderId: number, serviceId: number, input: { serviceName: string; quantity: number; unitPrice: number }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.lockOrder(connection, orderId);
      const service = await this.lockRepairService(connection, serviceId);
      if (Number(service.repair_order_id) !== Number(orderId)) {
        throw new AppError(404, 'NOT_FOUND', 'Repair service not found');
      }
      if (service.sales_invoice_id) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair service has already been billed');
      }

      await connection.execute(
        `UPDATE repair_order_services
         SET service_name_snapshot = ?, quantity = ?, unit_price_snapshot = ?
         WHERE id = ?`,
        [input.serviceName, input.quantity, input.unitPrice, serviceId],
      );
      await connection.commit();
      return this.findOrder(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updatePart(orderId: number, partId: number, input: { quantity: number }, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.lockOrder(connection, orderId);
      const part = await this.lockRepairPart(connection, partId);
      if (Number(part.repair_order_id) !== Number(orderId)) {
        throw new AppError(404, 'NOT_FOUND', 'Repair part not found');
      }
      if (part.sales_invoice_id) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair part has already been billed');
      }
      if (!part.reservation_id) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair part has no stock reservation');
      }

      const reservation = await this.lockReservation(connection, part.reservation_id);
      if (reservation.status !== 'active') {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair part reservation is not active');
      }

      const currentQty = toNumber(part.quantity);
      const nextQty = input.quantity;
      const delta = Number((nextQty - currentQty).toFixed(4));

      if (Math.abs(delta) > 0.000001) {
        const balance = await this.lockBalance(connection, reservation.product_id);
        if (delta > 0) {
          const available = toNumber(balance.quantity_on_hand) - toNumber(balance.quantity_reserved);
          if (delta > available) {
            throw new AppError(409, 'INSUFFICIENT_STOCK', 'Cannot reserve more than available stock', { available });
          }
        }

        await connection.execute(
          `UPDATE inventory_stock_balances
           SET quantity_reserved = quantity_reserved + ?
           WHERE product_id = ?`,
          [delta, reservation.product_id],
        );
        await connection.execute(
          'UPDATE inventory_stock_reservations SET quantity = ? WHERE id = ?',
          [nextQty, reservation.id],
        );
        await connection.execute(
          'UPDATE repair_order_parts SET quantity = ? WHERE id = ?',
          [nextQty, partId],
        );
      }

      await connection.commit();
      return this.findOrder(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async changeStatus(orderId: number, input: StatusChangeInput, userId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const order = await this.lockOrder(connection, orderId);
      const releasedReservations = input.status === 'cancelled'
        ? await this.releaseOrderReservations(connection, orderId, userId)
        : [];
      await connection.execute('UPDATE repair_orders SET status = ? WHERE id = ?', [input.status, orderId]);
      await this.insertStatusHistory(connection, orderId, String(order.status), input.status, input.note ?? null, userId);
      await connection.commit();
      return {
        order: await this.findOrder(orderId),
        releasedReservations,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteOrder(orderId: number, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.lockOrder(connection, orderId);

      const linkedDocuments = await this.listLinkedSalesDocumentsForUpdate(connection, orderId);
      if (linkedDocuments.length > 0) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair order is linked to sales documents');
      }

      const [billedServices] = await connection.execute<RowDataPacket[]>(
        `SELECT id
         FROM repair_order_services
         WHERE repair_order_id = ? AND sales_invoice_id IS NOT NULL
         LIMIT 1
         FOR UPDATE`,
        [orderId],
      );
      if (billedServices[0]) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair order has billed services');
      }

      const [billedParts] = await connection.execute<RowDataPacket[]>(
        `SELECT id
         FROM repair_order_parts
         WHERE repair_order_id = ? AND sales_invoice_id IS NOT NULL
         LIMIT 1
         FOR UPDATE`,
        [orderId],
      );
      if (billedParts[0]) {
        throw new AppError(409, 'STATE_CONFLICT', 'Repair order has billed parts');
      }

      const releasedReservations = await this.releaseOrderReservations(connection, orderId, actorUserId);

      await connection.execute('DELETE FROM repair_order_notes WHERE repair_order_id = ?', [orderId]);
      await connection.execute('DELETE FROM repair_order_status_history WHERE repair_order_id = ?', [orderId]);
      await connection.execute('DELETE FROM repair_order_services WHERE repair_order_id = ?', [orderId]);
      await connection.execute('DELETE FROM repair_order_parts WHERE repair_order_id = ?', [orderId]);
      await connection.execute('DELETE FROM repair_orders WHERE id = ?', [orderId]);

      await connection.commit();
      return { orderId, releasedReservations };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async addNote(orderId: number, input: NoteInput, userId: number) {
    await this.requireOrder(orderId);
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO repair_order_notes (repair_order_id, note_text, created_by_user_id) VALUES (?, ?, ?)',
      [orderId, input.noteText, userId],
    );
    return { id: result.insertId, repairOrderId: orderId, noteText: input.noteText };
  }

  async receipt(orderId: number) {
    const order = await this.findOrder(orderId);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
    }

    const orderRow = order as RepairOrderHeaderRow;
    const [customers] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM crm_customers WHERE id = ?',
      [orderRow.customer_id],
    );
    const device = await this.findDevice(orderRow.device_id);
    const services = (order as { services?: RepairServiceRow[] }).services ?? [];
    const parts = (order as { parts?: RepairPartRow[] }).parts ?? [];
    const serviceTotal = services.reduce(
      (sum, service) => sum + toNumber(service.quantity) * toNumber(service.unit_price_snapshot),
      0,
    );
    const partTotal = parts.reduce(
      (sum, part) => sum + toNumber(part.quantity) * toNumber(part.current_sale_price),
      0,
    );
    const subtotal = Number((serviceTotal + partTotal).toFixed(2));

    return {
      order,
      customer: customers[0] ?? null,
      device,
      services,
      parts: parts.map((part) => ({
        ...part,
        unit_price_snapshot: part.current_sale_price ?? 0,
      })),
      totals: {
        subtotal,
        tax: 0,
        total: subtotal,
      },
    };
  }

  async requireOrder(id: number) {
    const order = await this.findOrderHeader(id);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
    }
    return order;
  }

  async requireProduct(id: number) {
    const [rows] = await pool.execute<Array<RowDataPacket & {
      default_name: string;
      current_purchase_price: string;
      show_in_repair: number;
    }>>(
      `SELECT
         p.default_name,
         p.current_purchase_price,
         c.show_in_repair
       FROM catalog_products p
       INNER JOIN catalog_categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.is_active = TRUE
       LIMIT 1`,
      [id],
    );
    const product = rows[0];
    if (!product) {
      throw new AppError(404, 'NOT_FOUND', 'Product not found');
    }
    if (Number(product.show_in_repair ?? 0) !== 1) {
      throw new AppError(409, 'STATE_CONFLICT', 'Product cannot be used in repair orders');
    }
    return product;
  }

  private async requireCustomer(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM crm_customers WHERE id = ? AND is_active = TRUE',
      [id],
    );
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Customer not found');
    }
  }

  private async requireCategory(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM repair_device_categories WHERE id = ? AND is_active = TRUE',
      [id],
    );
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Device category not found');
    }
  }

  private async requireBrand(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM repair_device_brands WHERE id = ? AND is_active = TRUE',
      [id],
    );
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Brand not found');
    }
  }

  private async requireModel(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM repair_device_models WHERE id = ? AND is_active = TRUE',
      [id],
    );
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Model not found');
    }
  }

  private async findDevice(id: number) {
    const [rows] = await pool.execute<RepairDeviceRow[]>(
      `SELECT
         d.*,
         c.name_ru AS category_name_ru,
         b.name AS brand_name,
         m.name AS model_name
       FROM repair_devices d
       INNER JOIN repair_device_categories c ON c.id = d.category_id
       LEFT JOIN repair_device_brands b ON b.id = d.brand_id
       LEFT JOIN repair_device_models m ON m.id = d.model_id
       WHERE d.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async findOrderHeader(id: number) {
    const [rows] = await pool.execute<RepairOrderHeaderRow[]>(
      `SELECT
         o.*,
         c.name AS customer_name,
         c.customer_code,
         d.device_name,
         dc.name_ru AS device_category_name,
         db.name AS device_brand_name,
         dm.name AS device_model_name
       FROM repair_orders o
       INNER JOIN crm_customers c ON c.id = o.customer_id
       INNER JOIN repair_devices d ON d.id = o.device_id
       INNER JOIN repair_device_categories dc ON dc.id = d.category_id
       LEFT JOIN repair_device_brands db ON db.id = d.brand_id
       LEFT JOIN repair_device_models dm ON dm.id = d.model_id
       WHERE o.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async releaseOrderReservations(connection: PoolConnection, orderId: number, actorUserId: number) {
    const parts = await this.listUnbilledPartsForUpdate(connection, orderId);
    const releasedReservations: ReleasedReservationInfo[] = [];

    for (const part of parts) {
      const released = await this.releasePartReservationIfNeeded(connection, part, actorUserId);
      if (released) {
        releasedReservations.push(released);
      }
    }

    return releasedReservations;
  }

  private async releasePartReservationIfNeeded(
    connection: PoolConnection,
    part: RepairPartLockRow,
    actorUserId: number,
  ) {
    if (!part.reservation_id) {
      return null;
    }

    const reservation = await this.lockReservation(connection, part.reservation_id);
    if (Number(reservation.product_id) !== Number(part.product_id)) {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair reservation product does not match the part line');
    }

    if (reservation.status === 'released') {
      return null;
    }

    if (reservation.status !== 'active') {
      throw new AppError(409, 'STATE_CONFLICT', 'Repair part reservation cannot be released in its current state');
    }

    await this.lockBalance(connection, reservation.product_id);
    await connection.execute(
      `UPDATE inventory_stock_balances
       SET quantity_reserved = quantity_reserved - ?
       WHERE product_id = ?`,
      [reservation.quantity, reservation.product_id],
    );
    await connection.execute(
      `UPDATE inventory_stock_reservations
       SET status = 'released', released_by_user_id = ?, released_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [actorUserId, reservation.id],
    );

    return {
      reservationId: Number(reservation.id),
      productId: Number(reservation.product_id),
      quantity: Number(reservation.quantity),
      status: 'released' as const,
    };
  }

  private async listUnbilledPartsForUpdate(connection: PoolConnection, orderId: number) {
    const [rows] = await connection.execute<RepairPartLockRow[]>(
      `SELECT
         id,
         repair_order_id,
         product_id,
         quantity,
         reservation_id,
         sales_invoice_id
       FROM repair_order_parts
       WHERE repair_order_id = ? AND sales_invoice_id IS NULL
       ORDER BY id
       FOR UPDATE`,
      [orderId],
    );
    return rows;
  }

  private async listLinkedSalesDocumentsForUpdate(connection: PoolConnection, orderId: number) {
    const [rows] = await connection.execute<LinkedSalesDocumentRow[]>(
      `SELECT id, invoice_code, document_type, status
       FROM sales_invoices
       WHERE repair_order_id = ?
       FOR UPDATE`,
      [orderId],
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

  private async lockReservation(connection: PoolConnection, id: number) {
    const [rows] = await connection.execute<ReservationRow[]>(
      'SELECT id, product_id, quantity, status FROM inventory_stock_reservations WHERE id = ? FOR UPDATE',
      [id],
    );
    const reservation = rows[0];
    if (!reservation) {
      throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    }
    return reservation;
  }

  private async lockOrder(connection: PoolConnection, orderId: number) {
    const [rows] = await connection.execute<RepairOrderLockRow[]>(
      'SELECT id, status FROM repair_orders WHERE id = ? FOR UPDATE',
      [orderId],
    );
    const order = rows[0];
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
    }
    return order;
  }

  private async lockRepairService(connection: PoolConnection, serviceId: number) {
    const [rows] = await connection.execute<RepairServiceLockRow[]>(
      'SELECT id, repair_order_id, quantity, sales_invoice_id FROM repair_order_services WHERE id = ? FOR UPDATE',
      [serviceId],
    );
    const service = rows[0];
    if (!service) {
      throw new AppError(404, 'NOT_FOUND', 'Repair service not found');
    }
    return service;
  }

  private async lockRepairPart(connection: PoolConnection, partId: number) {
    const [rows] = await connection.execute<RepairPartLockRow[]>(
      'SELECT id, repair_order_id, product_id, quantity, reservation_id, sales_invoice_id FROM repair_order_parts WHERE id = ? FOR UPDATE',
      [partId],
    );
    const part = rows[0];
    if (!part) {
      throw new AppError(404, 'NOT_FOUND', 'Repair part not found');
    }
    return part;
  }

  private async insertStatusHistory(
    connection: PoolConnection | typeof pool,
    orderId: number,
    oldStatus: string | null,
    newStatus: RepairStatus,
    note: string | null,
    userId: number,
  ) {
    await connection.execute(
      `INSERT INTO repair_order_status_history (
         repair_order_id, old_status, new_status, note, changed_by_user_id
       )
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, oldStatus, newStatus, note, userId],
    );
  }

  private formatOrderCode(id: number) {
    return `REP-${String(id).padStart(6, '0')}`;
  }
}
