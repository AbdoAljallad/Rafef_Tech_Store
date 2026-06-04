import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AdjustmentCreateInput, PurchaseCreateInput, ReservationCreateInput } from './inventory.schemas.js';

export type StockBalanceRow = RowDataPacket & {
  product_id: number;
  sku: string;
  default_name: string;
  unit_name_ru: string;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
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

type PurchaseOrderRow = RowDataPacket & {
  id: number;
  supplier_id: number | null;
  status: 'draft' | 'received';
};

type PurchaseLineRow = RowDataPacket & {
  id: number;
  purchase_order_id: number;
  product_id: number;
  quantity: string;
  unit_cost: string;
};

function nullable(value: string | number | null | undefined) {
  return value === undefined ? null : value;
}

function toNumber(value: string | number) {
  return Number(value);
}

export class InventoryRepository {
  async listStock(params: { search?: string; offset: number; limit: number }) {
    const search = params.search?.trim();
    const values: Array<string | number> = [];
    let where = 'WHERE p.is_active = TRUE';

    if (search) {
      where += ' AND (p.default_name LIKE ? OR p.sku LIKE ?)';
      const like = `%${search}%`;
      values.push(like, like);
    }

    const [rows] = await pool.execute<StockBalanceRow[]>(
      `SELECT
         p.id AS product_id,
         p.sku,
         p.default_name,
         u.name_ru AS unit_name_ru,
         COALESCE(b.quantity_on_hand, 0) AS quantity_on_hand,
         COALESCE(b.quantity_reserved, 0) AS quantity_reserved,
         COALESCE(b.quantity_on_hand, 0) - COALESCE(b.quantity_reserved, 0) AS quantity_available
       FROM catalog_products p
       INNER JOIN catalog_units u ON u.id = p.unit_id
       LEFT JOIN inventory_stock_balances b ON b.product_id = p.id
       ${where}
       ORDER BY p.default_name
       LIMIT ${params.limit} OFFSET ${params.offset}`,
      values,
    );
    return rows;
  }

  async listMovements(productId: number, params: { offset: number; limit: number }) {
    await this.assertProductExists(productId);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM inventory_stock_movements
       WHERE product_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${params.limit} OFFSET ${params.offset}`,
      [productId],
    );
    return rows;
  }

  async createReservation(input: ReservationCreateInput, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.assertProductExists(input.productId, connection);
      const balance = await this.lockBalance(connection, input.productId);
      const available = toNumber(balance.quantity_on_hand) - toNumber(balance.quantity_reserved);
      if (input.quantity > available) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', 'Cannot reserve more than available stock', { available });
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO inventory_stock_reservations (
           product_id, quantity, source_type, source_id, notes, created_by_user_id
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [input.productId, input.quantity, input.sourceType, input.sourceId, nullable(input.notes), actorUserId],
      );
      await connection.execute(
        `UPDATE inventory_stock_balances
         SET quantity_reserved = quantity_reserved + ?
         WHERE product_id = ?`,
        [input.quantity, input.productId],
      );
      await connection.commit();
      return this.findReservationById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async consumeReservation(id: number, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const reservation = await this.lockReservation(connection, id);
      if (reservation.status !== 'active') {
        throw new AppError(409, 'STATE_CONFLICT', 'Cannot consume released, cancelled, or consumed reservation');
      }

      await this.lockBalance(connection, reservation.product_id);
      await connection.execute(
        `UPDATE inventory_stock_balances
         SET quantity_on_hand = quantity_on_hand - ?,
             quantity_reserved = quantity_reserved - ?
         WHERE product_id = ?`,
        [reservation.quantity, reservation.quantity, reservation.product_id],
      );
      await this.insertMovement(connection, {
        productId: reservation.product_id,
        movementType: 'reservation_consume',
        quantity: toNumber(reservation.quantity),
        unitCost: null,
        sourceType: 'stock_reservation',
        sourceId: reservation.id,
        note: 'Reservation consumed',
        actorUserId,
      });
      await connection.execute(
        `UPDATE inventory_stock_reservations
         SET status = 'consumed', consumed_by_user_id = ?, consumed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [actorUserId, id],
      );
      await connection.commit();
      return this.findReservationById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async releaseReservation(id: number, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const reservation = await this.lockReservation(connection, id);
      if (reservation.status !== 'active') {
        throw new AppError(409, 'STATE_CONFLICT', 'Only active reservations can be released');
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
        [actorUserId, id],
      );
      await connection.commit();
      return this.findReservationById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createPurchase(input: PurchaseCreateInput, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (input.supplierId) await this.assertSupplierExists(input.supplierId, connection);
      for (const line of input.lines) {
        await this.assertProductExists(line.productId, connection);
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO inventory_purchase_orders (supplier_id, notes, created_by_user_id)
         VALUES (?, ?, ?)`,
        [nullable(input.supplierId), nullable(input.notes), actorUserId],
      );
      for (const line of input.lines) {
        await connection.execute(
          `INSERT INTO inventory_purchase_order_lines (purchase_order_id, product_id, quantity, unit_cost)
           VALUES (?, ?, ?, ?)`,
          [result.insertId, line.productId, line.quantity, line.unitCost],
        );
      }
      await connection.commit();
      return this.findPurchaseById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async receivePurchase(id: number, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const purchase = await this.lockPurchase(connection, id);
      if (purchase.status !== 'draft') {
        throw new AppError(409, 'STATE_CONFLICT', 'Purchase has already been received');
      }
      const lines = await this.listPurchaseLines(connection, id);
      if (lines.length === 0) {
        throw new AppError(409, 'STATE_CONFLICT', 'Purchase has no lines to receive');
      }

      for (const line of lines) {
        await this.lockBalance(connection, line.product_id);
        await connection.execute(
          `UPDATE inventory_stock_balances
           SET quantity_on_hand = quantity_on_hand + ?
           WHERE product_id = ?`,
          [line.quantity, line.product_id],
        );
        await connection.execute(
          `UPDATE inventory_purchase_order_lines
           SET received_quantity = quantity
           WHERE id = ?`,
          [line.id],
        );
        await this.insertMovement(connection, {
          productId: line.product_id,
          movementType: 'purchase_in',
          quantity: toNumber(line.quantity),
          unitCost: toNumber(line.unit_cost),
          sourceType: 'purchase_order',
          sourceId: id,
          note: 'Purchase received',
          actorUserId,
        });
      }

      await connection.execute(
        `UPDATE inventory_purchase_orders
         SET status = 'received', received_by_user_id = ?, received_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [actorUserId, id],
      );
      await connection.commit();
      return this.findPurchaseById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createAdjustment(input: AdjustmentCreateInput, actorUserId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const line of input.lines) {
        await this.assertProductExists(line.productId, connection);
      }
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO inventory_adjustments (reason, notes, created_by_user_id)
         VALUES (?, ?, ?)`,
        [input.reason, nullable(input.notes), actorUserId],
      );

      for (const line of input.lines) {
        const balance = await this.lockBalance(connection, line.productId);
        if (line.direction === 'out') {
          const available = toNumber(balance.quantity_on_hand) - toNumber(balance.quantity_reserved);
          if (line.quantity > available) {
            throw new AppError(409, 'INSUFFICIENT_STOCK', 'Cannot adjust out more than available stock', { available });
          }
        }

        await connection.execute(
          `INSERT INTO inventory_adjustment_lines (
             adjustment_id, product_id, direction, quantity, unit_cost, notes
           )
           VALUES (?, ?, ?, ?, ?, ?)`,
          [result.insertId, line.productId, line.direction, line.quantity, nullable(line.unitCost), nullable(line.notes)],
        );
        await connection.execute(
          `UPDATE inventory_stock_balances
           SET quantity_on_hand = quantity_on_hand ${line.direction === 'in' ? '+' : '-'} ?
           WHERE product_id = ?`,
          [line.quantity, line.productId],
        );
        await this.insertMovement(connection, {
          productId: line.productId,
          movementType: line.direction === 'in' ? 'adjustment_in' : 'adjustment_out',
          quantity: line.quantity,
          unitCost: line.unitCost ?? null,
          sourceType: 'stock_adjustment',
          sourceId: result.insertId,
          note: input.reason,
          actorUserId,
        });
      }

      await connection.commit();
      return this.findAdjustmentById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findReservationById(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM inventory_stock_reservations WHERE id = ?', [id]);
    return rows[0] ?? null;
  }

  async findPurchaseById(id: number) {
    const [orders] = await pool.execute<RowDataPacket[]>('SELECT * FROM inventory_purchase_orders WHERE id = ?', [id]);
    const order = orders[0];
    if (!order) return null;
    const [lines] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM inventory_purchase_order_lines WHERE purchase_order_id = ? ORDER BY id',
      [id],
    );
    return { ...order, lines };
  }

  async findAdjustmentById(id: number) {
    const [adjustments] = await pool.execute<RowDataPacket[]>('SELECT * FROM inventory_adjustments WHERE id = ?', [id]);
    const adjustment = adjustments[0];
    if (!adjustment) return null;
    const [lines] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM inventory_adjustment_lines WHERE adjustment_id = ? ORDER BY id',
      [id],
    );
    return { ...adjustment, lines };
  }

  private async assertProductExists(productId: number, connection: PoolConnection | typeof pool = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM catalog_products WHERE id = ? AND is_active = TRUE LIMIT 1',
      [productId],
    );
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Product not found');
    }
  }

  private async assertSupplierExists(supplierId: number, connection: PoolConnection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM catalog_suppliers WHERE id = ? AND is_active = TRUE LIMIT 1',
      [supplierId],
    );
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Supplier not found');
    }
  }

  private async lockBalance(connection: PoolConnection, productId: number) {
    await connection.execute('INSERT IGNORE INTO inventory_stock_balances (product_id) VALUES (?)', [productId]);
    const [rows] = await connection.execute<BalanceLockRow[]>(
      'SELECT * FROM inventory_stock_balances WHERE product_id = ? FOR UPDATE',
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
      'SELECT * FROM inventory_stock_reservations WHERE id = ? FOR UPDATE',
      [id],
    );
    const reservation = rows[0];
    if (!reservation) {
      throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    }
    return reservation;
  }

  private async lockPurchase(connection: PoolConnection, id: number) {
    const [rows] = await connection.execute<PurchaseOrderRow[]>(
      'SELECT * FROM inventory_purchase_orders WHERE id = ? FOR UPDATE',
      [id],
    );
    const purchase = rows[0];
    if (!purchase) {
      throw new AppError(404, 'NOT_FOUND', 'Purchase not found');
    }
    return purchase;
  }

  private async listPurchaseLines(connection: PoolConnection, purchaseId: number) {
    const [rows] = await connection.execute<PurchaseLineRow[]>(
      'SELECT * FROM inventory_purchase_order_lines WHERE purchase_order_id = ? ORDER BY id FOR UPDATE',
      [purchaseId],
    );
    return rows;
  }

  private async insertMovement(
    connection: PoolConnection,
    params: {
      productId: number;
      movementType: 'purchase_in' | 'adjustment_in' | 'adjustment_out' | 'reservation_consume';
      quantity: number;
      unitCost: number | null;
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
