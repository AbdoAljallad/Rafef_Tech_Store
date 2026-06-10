import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { demoInvoices, demoProducts, demoRepairOrders } from './demo-business-data.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function money(value: number) {
  return Number(value.toFixed(2));
}

async function getConnection() {
  return mysql.createConnection({
    host: env('DB_HOST', env('MYSQL_HOST', '127.0.0.1')),
    port: Number(env('DB_PORT', env('MYSQL_PORT', '3306'))),
    user: env('DB_USER', env('MYSQL_USER', 'rafef_user')),
    password: env('DB_PASSWORD', env('MYSQL_PASSWORD', 'rafef_password')),
    database: env('DB_NAME', env('MYSQL_DATABASE', 'rafef_tech')),
    multipleStatements: false,
    charset: 'utf8mb4',
  });
}

async function getActorUserId(conn: mysql.Connection) {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT id FROM auth_users WHERE status = 'active' ORDER BY id LIMIT 1`,
  );

  const userId = rows[0]?.id ? Number(rows[0].id) : null;
  if (!userId) {
    throw new Error('No active auth user found. Run the main backend seed first.');
  }

  return userId;
}

async function getLookupMap(conn: mysql.Connection, table: string, keyColumn: string, valueColumn = 'id') {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT ${keyColumn}, ${valueColumn} FROM ${table}`);
  return new Map(rows.map((row) => [String(row[keyColumn]), Number(row[valueColumn])]));
}

async function getActiveCustomers(conn: mysql.Connection) {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT id, name FROM crm_customers WHERE is_active = TRUE ORDER BY id LIMIT 10`,
  );

  if (rows.length < 2) {
    throw new Error('At least two active customers are required before importing demo business data.');
  }

  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
  }));
}

async function ensureBrand(conn: mysql.Connection, brandName: string) {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT id FROM repair_device_brands WHERE name = ? LIMIT 1`,
    [brandName],
  );

  if (rows[0]?.id) {
    return Number(rows[0].id);
  }

  const [result] = await conn.execute<mysql.ResultSetHeader>(
    `INSERT INTO repair_device_brands (name, is_active) VALUES (?, TRUE)`,
    [brandName],
  );

  return result.insertId;
}

async function ensureProductSeedData(conn: mysql.Connection, actorUserId: number) {
  const categoryIds = await getLookupMap(conn, 'catalog_categories', 'code');
  const unitIds = await getLookupMap(conn, 'catalog_units', 'code');
  const productIds = new Map<string, number>();

  for (const product of demoProducts) {
    const categoryId = categoryIds.get(product.categoryCode);
    const unitId = unitIds.get(product.unitCode);

    if (!categoryId) {
      throw new Error(`Missing catalog category: ${product.categoryCode}`);
    }

    if (!unitId) {
      throw new Error(`Missing catalog unit: ${product.unitCode}`);
    }

    const [existingRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM catalog_products WHERE sku = ? LIMIT 1`,
      [product.sku],
    );

    let productId = existingRows[0]?.id ? Number(existingRows[0].id) : null;

    if (!productId) {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO catalog_products (
          category_id, unit_id, sku, default_name, tracking_type,
          current_purchase_price, current_sale_price, reorder_threshold, created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          categoryId,
          unitId,
          product.sku,
          product.defaultName,
          product.trackingType,
          product.purchasePrice,
          product.salePrice,
          product.reorderThreshold,
          actorUserId,
        ],
      );
      productId = result.insertId;
    }

    productIds.set(product.sku, productId);

    await conn.execute(
      `INSERT INTO catalog_product_barcodes (product_id, barcode, is_primary)
       SELECT ?, ?, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM catalog_product_barcodes WHERE barcode = ?
       )`,
      [productId, product.barcode, product.barcode],
    );

    await conn.execute(
      `INSERT INTO inventory_stock_balances (product_id, quantity_on_hand, quantity_reserved)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE quantity_on_hand = GREATEST(quantity_on_hand, VALUES(quantity_on_hand))`,
      [productId, product.quantityOnHand],
    );

    const [movementRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM inventory_stock_movements
       WHERE source_type = 'demo_seed' AND source_id = ? AND product_id = ?
       LIMIT 1`,
      [productId, productId],
    );

    if (!movementRows[0]?.id) {
      await conn.execute(
        `INSERT INTO inventory_stock_movements (
          product_id, movement_type, quantity, unit_cost, source_type, source_id, note, created_by_user_id
        )
        VALUES (?, 'adjustment_in', ?, ?, 'demo_seed', ?, 'Начальный демонстрационный остаток', ?)`,
        [productId, product.quantityOnHand, product.purchasePrice, productId, actorUserId],
      );
    }
  }

  return productIds;
}

async function ensureInvoiceSeedData(
  conn: mysql.Connection,
  actorUserId: number,
  customers: Array<{ id: number; name: string }>,
  productIds: Map<string, number>,
) {
  for (const invoice of demoInvoices) {
    const [existingRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM sales_invoices WHERE invoice_code = ? LIMIT 1`,
      [invoice.invoiceCode],
    );

    if (existingRows[0]?.id) {
      continue;
    }

    const customerId = invoice.customerIndex === null ? null : customers[invoice.customerIndex]?.id ?? null;
    const subtotal = money(invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
    const total = subtotal;

    const approvedAt = invoice.status === 'approved' ? new Date() : null;
    const voidedAt = invoice.status === 'voided' ? new Date() : null;

    const [invoiceResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO sales_invoices (
        invoice_code, customer_id, is_walk_in, status, subtotal, tax, total,
        created_by_user_id, approved_by_user_id, approved_at, voided_by_user_id, voided_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        invoice.invoiceCode,
        customerId,
        invoice.isWalkIn ? 1 : 0,
        invoice.status,
        subtotal,
        total,
        actorUserId,
        invoice.status === 'approved' ? actorUserId : null,
        approvedAt,
        invoice.status === 'voided' ? actorUserId : null,
        voidedAt,
      ],
    );

    const invoiceId = invoiceResult.insertId;

    for (const line of invoice.lines) {
      const productId = productIds.get(line.sku);
      if (!productId) {
        throw new Error(`Missing demo product for invoice line: ${line.sku}`);
      }

      const productSeed = demoProducts.find((product) => product.sku === line.sku);
      await conn.execute(
        `INSERT INTO sales_invoice_lines (
          invoice_id, product_id, quantity, unit_price, unit_cost, line_total
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          productId,
          line.quantity,
          line.unitPrice,
          productSeed?.purchasePrice ?? null,
          money(line.quantity * line.unitPrice),
        ],
      );
    }
  }
}

async function ensureRepairSeedData(
  conn: mysql.Connection,
  actorUserId: number,
  customers: Array<{ id: number; name: string }>,
) {
  const categoryIds = await getLookupMap(conn, 'repair_device_categories', 'code');

  for (const order of demoRepairOrders) {
    const [existingOrders] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM repair_orders WHERE order_code = ? LIMIT 1`,
      [order.orderCode],
    );

    if (existingOrders[0]?.id) {
      continue;
    }

    const customer = customers[order.customerIndex];
    if (!customer) {
      throw new Error(`Missing customer at index ${order.customerIndex} for ${order.orderCode}`);
    }

    const categoryId = categoryIds.get(order.deviceCategoryCode);
    if (!categoryId) {
      throw new Error(`Missing repair category: ${order.deviceCategoryCode}`);
    }

    const brandId = await ensureBrand(conn, order.brandName);

    const [existingDevices] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM repair_devices WHERE customer_id = ? AND serial_no = ? LIMIT 1`,
      [customer.id, order.serialNo],
    );

    let deviceId = existingDevices[0]?.id ? Number(existingDevices[0].id) : null;

    if (!deviceId) {
      const [deviceResult] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO repair_devices (
          customer_id, category_id, brand_id, model_id, device_name, serial_no, imei, notes
        )
        VALUES (?, ?, ?, NULL, ?, ?, NULL, ?)`,
        [customer.id, categoryId, brandId, order.deviceName, order.serialNo, 'Демонстрационное устройство для теста интерфейса'],
      );
      deviceId = deviceResult.insertId;
    }

    const [orderResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO repair_orders (
        order_code, customer_id, device_id, status, problem_description, intake_notes, created_by_user_id, assigned_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        order.orderCode,
        customer.id,
        deviceId,
        order.status,
        order.problemDescription,
        order.intakeNotes,
        actorUserId,
      ],
    );

    const orderId = orderResult.insertId;

    await conn.execute(
      `INSERT INTO repair_order_status_history (
        repair_order_id, old_status, new_status, note, changed_by_user_id
      )
      VALUES (?, NULL, 'new', 'Демонстрационный заказ создан', ?)`,
      [orderId, actorUserId],
    );

    if (order.status !== 'new') {
      await conn.execute(
        `INSERT INTO repair_order_status_history (
          repair_order_id, old_status, new_status, note, changed_by_user_id
        )
        VALUES (?, 'new', ?, 'Демонстрационный переход статуса', ?)`,
        [orderId, order.status, actorUserId],
      );
    }

    for (const service of order.services) {
      await conn.execute(
        `INSERT INTO repair_order_services (
          repair_order_id, service_id, service_name_snapshot, quantity, unit_price_snapshot
        )
        VALUES (?, NULL, ?, ?, ?)`,
        [orderId, service.serviceName, service.quantity, service.unitPrice],
      );
    }

    await conn.execute(
      `INSERT INTO repair_order_notes (repair_order_id, note_text, created_by_user_id)
       VALUES (?, ?, ?)`,
      [orderId, order.noteText, actorUserId],
    );
  }
}

async function main() {
  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    const actorUserId = await getActorUserId(conn);
    const customers = await getActiveCustomers(conn);
    const productIds = await ensureProductSeedData(conn, actorUserId);
    await ensureInvoiceSeedData(conn, actorUserId, customers, productIds);
    await ensureRepairSeedData(conn, actorUserId, customers);

    await conn.commit();

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          products: demoProducts.length,
          invoices: demoInvoices.length,
          repairOrders: demoRepairOrders.length,
          customersUsed: customers.slice(0, 3),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
