import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
const liveReservationJoin = `
  LEFT JOIN (
    SELECT product_id, COALESCE(SUM(quantity), 0) AS quantity_reserved_live
    FROM inventory_stock_reservations
    WHERE status = 'active'
    GROUP BY product_id
  ) sr ON sr.product_id = p.id
`;
const stockAvailabilitySelect = `
  COALESCE(sb.quantity_on_hand, 0) AS quantity_on_hand,
  COALESCE(sr.quantity_reserved_live, 0) AS quantity_reserved,
  GREATEST(COALESCE(sb.quantity_on_hand, 0) - COALESCE(sr.quantity_reserved_live, 0), 0) AS quantity_available
`;
function nullable(value) {
    return value === undefined ? null : value;
}
export class CatalogRepository {
    async listProducts(params) {
        const search = params.search?.trim();
        const values = [];
        let where = 'WHERE p.is_active = TRUE';
        if (search) {
            where += ` AND (
        p.default_name LIKE ?
        OR p.sku LIKE ?
        OR c.default_name LIKE ?
        OR EXISTS (
          SELECT 1
          FROM catalog_product_barcodes b
          WHERE b.product_id = p.id AND b.barcode LIKE ?
        )
      )`;
            const like = `%${search}%`;
            values.push(like, like, like, like);
        }
        const [rows] = await pool.execute(`SELECT
         p.*,
         c.default_name AS category_name,
         c.code AS category_code,
         c.show_in_sales,
         c.show_in_repair,
         c.show_in_projects,
         c.show_in_creative,
         u.name_ru AS unit_name_ru,
         pb.barcode AS primary_barcode,
         ${stockAvailabilitySelect}
       FROM catalog_products p
       INNER JOIN catalog_categories c ON c.id = p.category_id
       INNER JOIN catalog_units u ON u.id = p.unit_id
       LEFT JOIN catalog_product_barcodes pb ON pb.product_id = p.id AND pb.is_primary = TRUE
       LEFT JOIN inventory_stock_balances sb ON sb.product_id = p.id
       ${liveReservationJoin}
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ${params.limit} OFFSET ${params.offset}`, values);
        return rows;
    }
    async findProductById(id) {
        const [rows] = await pool.execute(`SELECT
         p.*,
         c.default_name AS category_name,
         c.code AS category_code,
         c.show_in_sales,
         c.show_in_repair,
         c.show_in_projects,
         c.show_in_creative,
         u.name_ru AS unit_name_ru,
         pb.barcode AS primary_barcode,
         ${stockAvailabilitySelect}
       FROM catalog_products p
       INNER JOIN catalog_categories c ON c.id = p.category_id
       INNER JOIN catalog_units u ON u.id = p.unit_id
       LEFT JOIN catalog_product_barcodes pb ON pb.product_id = p.id AND pb.is_primary = TRUE
       LEFT JOIN inventory_stock_balances sb ON sb.product_id = p.id
       ${liveReservationJoin}
       WHERE p.id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async findProductByBarcode(barcode) {
        const [rows] = await pool.execute(`SELECT
         p.*,
         c.default_name AS category_name,
         c.code AS category_code,
         c.show_in_sales,
         c.show_in_repair,
         c.show_in_projects,
         c.show_in_creative,
         u.name_ru AS unit_name_ru,
         b.barcode AS primary_barcode,
         ${stockAvailabilitySelect}
       FROM catalog_product_barcodes b
       INNER JOIN catalog_products p ON p.id = b.product_id
       INNER JOIN catalog_categories c ON c.id = p.category_id
       INNER JOIN catalog_units u ON u.id = p.unit_id
       LEFT JOIN inventory_stock_balances sb ON sb.product_id = p.id
       ${liveReservationJoin}
       WHERE b.barcode = ? AND p.is_active = TRUE
       LIMIT 1`, [barcode]);
        return rows[0] ?? null;
    }
    async createProduct(input, userId) {
        const [result] = await pool.execute(`INSERT INTO catalog_products (
         category_id, unit_id, sku, default_name, tracking_type,
         current_purchase_price, current_sale_price, reorder_threshold, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            input.categoryId,
            input.unitId,
            input.sku,
            input.defaultName,
            input.trackingType,
            input.currentPurchasePrice,
            input.currentSalePrice,
            input.reorderThreshold,
            userId,
        ]);
        if (input.barcode) {
            await this.addBarcode(result.insertId, input.barcode, true);
        }
        await pool.execute(`INSERT IGNORE INTO inventory_stock_balances (product_id, quantity_on_hand, quantity_reserved)
       VALUES (?, 0, 0)`, [result.insertId]);
        return this.findProductById(result.insertId);
    }
    async updateProduct(id, input, userId) {
        await pool.execute(`UPDATE catalog_products
       SET category_id = COALESCE(?, category_id),
           unit_id = COALESCE(?, unit_id),
           sku = COALESCE(?, sku),
           default_name = COALESCE(?, default_name),
           tracking_type = COALESCE(?, tracking_type),
           current_purchase_price = COALESCE(?, current_purchase_price),
           current_sale_price = COALESCE(?, current_sale_price),
           reorder_threshold = COALESCE(?, reorder_threshold),
           updated_by_user_id = ?
       WHERE id = ?`, [
            input.categoryId ?? null,
            input.unitId ?? null,
            input.sku ?? null,
            input.defaultName ?? null,
            input.trackingType ?? null,
            input.currentPurchasePrice ?? null,
            input.currentSalePrice ?? null,
            input.reorderThreshold ?? null,
            userId,
            id,
        ]);
        return this.findProductById(id);
    }
    async changePrice(id, input, userId) {
        const before = await this.findProductById(id);
        if (!before)
            return null;
        await pool.execute(`INSERT INTO catalog_product_price_history (
         product_id, old_purchase_price, new_purchase_price, old_sale_price, new_sale_price, reason, changed_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            id,
            before.current_purchase_price,
            input.newPurchasePrice,
            before.current_sale_price,
            input.newSalePrice,
            nullable(input.reason),
            userId,
        ]);
        await pool.execute(`UPDATE catalog_products
       SET current_purchase_price = ?, current_sale_price = ?, updated_by_user_id = ?
       WHERE id = ?`, [input.newPurchasePrice, input.newSalePrice, userId, id]);
        return this.findProductById(id);
    }
    async listCategories() {
        const [rows] = await pool.query('SELECT * FROM catalog_categories WHERE is_active = TRUE ORDER BY default_name');
        return rows;
    }
    async createCategory(input) {
        const [result] = await pool.execute(`INSERT INTO catalog_categories (
         parent_id, code, default_name, show_in_sales, show_in_repair, show_in_projects, show_in_creative
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            nullable(input.parentId),
            input.code,
            input.defaultName,
            input.showInSales,
            input.showInRepair,
            input.showInProjects,
            input.showInCreative,
        ]);
        const [rows] = await pool.execute('SELECT * FROM catalog_categories WHERE id = ?', [result.insertId]);
        return rows[0];
    }
    async listUnits() {
        const [rows] = await pool.query('SELECT * FROM catalog_units ORDER BY id');
        return rows;
    }
    async listServices(module) {
        const values = [];
        let where = 'WHERE s.is_active = TRUE';
        if (module) {
            where += ' AND s.module = ?';
            values.push(module);
        }
        const [rows] = await pool.execute(`SELECT s.*, c.default_name AS category_name
       FROM catalog_services s
       INNER JOIN catalog_service_categories c ON c.id = s.service_category_id
       ${where}
       ORDER BY s.module, s.default_name`, values);
        return rows;
    }
    async listSuppliers() {
        const [rows] = await pool.query(`SELECT *
       FROM catalog_suppliers
       WHERE is_active = TRUE
       ORDER BY name ASC, id DESC`);
        return rows;
    }
    async createSupplier(input, userId) {
        const [result] = await pool.execute(`INSERT INTO catalog_suppliers (name, phone, email, address_text, notes, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`, [input.name, nullable(input.phone), nullable(input.email), nullable(input.addressText), nullable(input.notes), userId]);
        const [rows] = await pool.execute('SELECT * FROM catalog_suppliers WHERE id = ?', [result.insertId]);
        return rows[0];
    }
    async listProductSuppliers(productId) {
        const [rows] = await pool.execute(`SELECT
         ps.supplier_id,
         s.name AS supplier_name,
         s.phone AS supplier_phone,
         s.email AS supplier_email,
         ps.supplier_sku,
         ps.last_purchase_price
       FROM catalog_product_suppliers ps
       INNER JOIN catalog_suppliers s ON s.id = ps.supplier_id
       WHERE ps.product_id = ?
       ORDER BY s.name ASC`, [productId]);
        return rows;
    }
    async replaceProductSuppliers(productId, links) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await this.assertProductExists(productId, connection);
            if (links.length) {
                for (const link of links) {
                    await this.assertSupplierExists(link.supplierId, connection);
                }
            }
            await connection.execute('DELETE FROM catalog_product_suppliers WHERE product_id = ?', [productId]);
            for (const link of links) {
                await connection.execute(`INSERT INTO catalog_product_suppliers (product_id, supplier_id, supplier_sku, last_purchase_price)
           VALUES (?, ?, ?, ?)`, [
                    productId,
                    link.supplierId,
                    nullable(link.supplierSku),
                    link.lastPurchasePrice ?? null,
                ]);
            }
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
        return this.listProductSuppliers(productId);
    }
    async addBarcode(productId, barcode, isPrimary) {
        await pool.execute(`INSERT INTO catalog_product_barcodes (product_id, barcode, is_primary)
       VALUES (?, ?, ?)`, [productId, barcode, isPrimary]);
    }
    async assertProductExists(productId, connection) {
        const [rows] = await connection.execute('SELECT id FROM catalog_products WHERE id = ? LIMIT 1', [productId]);
        if (!rows.length) {
            throw new AppError(404, 'NOT_FOUND', `Product ${productId} not found`);
        }
    }
    async assertSupplierExists(supplierId, connection) {
        const [rows] = await connection.execute('SELECT id FROM catalog_suppliers WHERE id = ? AND is_active = TRUE LIMIT 1', [supplierId]);
        if (!rows.length) {
            throw new AppError(404, 'NOT_FOUND', `Supplier ${supplierId} not found`);
        }
    }
}
