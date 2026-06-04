import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import type { CategoryCreateInput, PriceChangeInput, ProductCreateInput, ProductUpdateInput, SupplierCreateInput } from './catalog.schemas.js';

export type ProductRow = RowDataPacket & {
  id: number;
  category_id: number;
  unit_id: number;
  sku: string;
  default_name: string;
  tracking_type: 'quantity' | 'serial' | 'batch';
  current_purchase_price: string;
  current_sale_price: string;
  reorder_threshold: string;
  is_active: number;
  category_name: string;
  unit_name_ru: string;
};

function nullable(value: string | number | null | undefined) {
  return value === undefined ? null : value;
}

export class CatalogRepository {
  async listProducts(params: { search?: string; offset: number; limit: number }) {
    const search = params.search?.trim();
    const values: Array<string | number> = [];
    let where = 'WHERE p.is_active = TRUE';

    if (search) {
      where += ' AND (p.default_name LIKE ? OR p.sku LIKE ?)';
      const like = `%${search}%`;
      values.push(like, like);
    }

    const [rows] = await pool.execute<ProductRow[]>(
      `SELECT p.*, c.default_name AS category_name, u.name_ru AS unit_name_ru
       FROM catalog_products p
       INNER JOIN catalog_categories c ON c.id = p.category_id
       INNER JOIN catalog_units u ON u.id = p.unit_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ${params.limit} OFFSET ${params.offset}`,
      values,
    );
    return rows;
  }

  async findProductById(id: number) {
    const [rows] = await pool.execute<ProductRow[]>(
      `SELECT p.*, c.default_name AS category_name, u.name_ru AS unit_name_ru
       FROM catalog_products p
       INNER JOIN catalog_categories c ON c.id = p.category_id
       INNER JOIN catalog_units u ON u.id = p.unit_id
       WHERE p.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findProductByBarcode(barcode: string) {
    const [rows] = await pool.execute<ProductRow[]>(
      `SELECT p.*, c.default_name AS category_name, u.name_ru AS unit_name_ru
       FROM catalog_product_barcodes b
       INNER JOIN catalog_products p ON p.id = b.product_id
       INNER JOIN catalog_categories c ON c.id = p.category_id
       INNER JOIN catalog_units u ON u.id = p.unit_id
       WHERE b.barcode = ? AND p.is_active = TRUE
       LIMIT 1`,
      [barcode],
    );
    return rows[0] ?? null;
  }

  async createProduct(input: ProductCreateInput, userId: number) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO catalog_products (
         category_id, unit_id, sku, default_name, tracking_type,
         current_purchase_price, current_sale_price, reorder_threshold, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.categoryId,
        input.unitId,
        input.sku,
        input.defaultName,
        input.trackingType,
        input.currentPurchasePrice,
        input.currentSalePrice,
        input.reorderThreshold,
        userId,
      ],
    );

    if (input.barcode) {
      await this.addBarcode(result.insertId, input.barcode, true);
    }

    return this.findProductById(result.insertId);
  }

  async updateProduct(id: number, input: ProductUpdateInput, userId: number) {
    await pool.execute(
      `UPDATE catalog_products
       SET category_id = COALESCE(?, category_id),
           unit_id = COALESCE(?, unit_id),
           sku = COALESCE(?, sku),
           default_name = COALESCE(?, default_name),
           tracking_type = COALESCE(?, tracking_type),
           current_purchase_price = COALESCE(?, current_purchase_price),
           current_sale_price = COALESCE(?, current_sale_price),
           reorder_threshold = COALESCE(?, reorder_threshold),
           updated_by_user_id = ?
       WHERE id = ?`,
      [
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
      ],
    );
    return this.findProductById(id);
  }

  async changePrice(id: number, input: PriceChangeInput, userId: number) {
    const before = await this.findProductById(id);
    if (!before) return null;

    await pool.execute(
      `INSERT INTO catalog_product_price_history (
         product_id, old_purchase_price, new_purchase_price, old_sale_price, new_sale_price, reason, changed_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        before.current_purchase_price,
        input.newPurchasePrice,
        before.current_sale_price,
        input.newSalePrice,
        nullable(input.reason),
        userId,
      ],
    );
    await pool.execute(
      `UPDATE catalog_products
       SET current_purchase_price = ?, current_sale_price = ?, updated_by_user_id = ?
       WHERE id = ?`,
      [input.newPurchasePrice, input.newSalePrice, userId, id],
    );
    return this.findProductById(id);
  }

  async listCategories() {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM catalog_categories WHERE is_active = TRUE ORDER BY default_name',
    );
    return rows;
  }

  async createCategory(input: CategoryCreateInput) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO catalog_categories (
         parent_id, code, default_name, show_in_sales, show_in_repair, show_in_projects, show_in_creative
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nullable(input.parentId),
        input.code,
        input.defaultName,
        input.showInSales,
        input.showInRepair,
        input.showInProjects,
        input.showInCreative,
      ],
    );
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM catalog_categories WHERE id = ?', [result.insertId]);
    return rows[0];
  }

  async listUnits() {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM catalog_units ORDER BY id');
    return rows;
  }

  async listServices(module?: string) {
    const values: string[] = [];
    let where = 'WHERE s.is_active = TRUE';
    if (module) {
      where += ' AND s.module = ?';
      values.push(module);
    }
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, c.default_name AS category_name
       FROM catalog_services s
       INNER JOIN catalog_service_categories c ON c.id = s.service_category_id
       ${where}
       ORDER BY s.module, s.default_name`,
      values,
    );
    return rows;
  }

  async createSupplier(input: SupplierCreateInput, userId: number) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO catalog_suppliers (name, phone, email, address_text, notes, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.name, nullable(input.phone), nullable(input.email), nullable(input.addressText), nullable(input.notes), userId],
    );
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM catalog_suppliers WHERE id = ?', [result.insertId]);
    return rows[0];
  }

  private async addBarcode(productId: number, barcode: string, isPrimary: boolean) {
    await pool.execute(
      `INSERT INTO catalog_product_barcodes (product_id, barcode, is_primary)
       VALUES (?, ?, ?)`,
      [productId, barcode, isPrimary],
    );
  }
}
