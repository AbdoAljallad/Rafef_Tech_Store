import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
import type {
  InstalledAssetInput,
  ProjectCreateInput,
  ProjectMaterialInput,
  ProjectNoteInput,
  ProjectSiteInput,
  ProjectStatus,
  ProjectStatusChangeInput,
  ProjectTypeInput,
} from './projects.schemas.js';

function nullable(value: string | number | null | undefined) {
  return value === undefined ? null : value;
}

type ProjectHeaderRow = RowDataPacket & {
  id: number;
  project_code: string;
  customer_id: number | null;
  customer_code: string | null;
  customer_name: string | null;
  title: string;
  status: ProjectStatus;
};

export class ProjectsRepository {
  async listTypes() {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM project_types WHERE is_active = TRUE ORDER BY default_name');
    return rows;
  }

  async createType(input: ProjectTypeInput, userId: number) {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO project_types (code, default_name, description, created_by_user_id) VALUES (?, ?, ?, ?)',
      [input.code, input.defaultName, nullable(input.description), userId],
    );
    return { id: result.insertId, code: input.code, default_name: input.defaultName, description: input.description ?? null };
  }

  async listProjects(params: { offset: number; limit: number }) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, pt.default_name AS project_type_name, c.name AS customer_name
       FROM projects p
       LEFT JOIN project_types pt ON pt.id = p.project_type_id
       LEFT JOIN crm_customers c ON c.id = p.customer_id
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ${params.limit} OFFSET ${params.offset}`,
    );
    return rows;
  }

  async createProject(input: ProjectCreateInput, userId: number) {
    if (input.projectTypeId) await this.requireType(input.projectTypeId);
    if (input.customerId) await this.requireCustomer(input.customerId);
    if (input.assignedUserId) await this.requireUser(input.assignedUserId);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO projects (
         project_code, project_type_id, customer_id, title, description, planned_start_at, planned_end_at,
         assigned_user_id, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        await this.nextProjectCode(),
        nullable(input.projectTypeId),
        nullable(input.customerId),
        input.title,
        nullable(input.description),
        nullable(input.plannedStartAt),
        nullable(input.plannedEndAt),
        nullable(input.assignedUserId),
        userId,
      ],
    );
    await this.insertStatusHistory(result.insertId, null, 'draft', 'created', 'Project created', userId);
    return this.findProject(result.insertId);
  }

  async findProject(id: number) {
    const [projects] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.*,
         pt.default_name AS project_type_name,
         c.customer_code,
         c.name AS customer_name
       FROM projects p
       LEFT JOIN project_types pt ON pt.id = p.project_type_id
       LEFT JOIN crm_customers c ON c.id = p.customer_id
       WHERE p.id = ?
       LIMIT 1`,
      [id],
    );
    const project = projects[0];
    if (!project) return null;
    const [sites] = await pool.execute<RowDataPacket[]>('SELECT * FROM project_sites WHERE project_id = ? ORDER BY id', [id]);
    const [materials] = await pool.execute<RowDataPacket[]>(
      `SELECT
         m.*,
         p.sku AS product_sku,
         p.current_sale_price,
         r.status AS reservation_status
       FROM project_materials m
       INNER JOIN catalog_products p ON p.id = m.product_id
       LEFT JOIN inventory_stock_reservations r ON r.id = m.reservation_id
       WHERE m.project_id = ?
       ORDER BY m.id`,
      [id],
    );
    const [assets] = await pool.execute<RowDataPacket[]>('SELECT * FROM project_installed_assets WHERE project_id = ? ORDER BY id', [id]);
    const [notes] = await pool.execute<RowDataPacket[]>('SELECT * FROM project_notes WHERE project_id = ? ORDER BY id', [id]);
    const [history] = await pool.execute<RowDataPacket[]>('SELECT * FROM project_status_history WHERE project_id = ? ORDER BY id', [id]);
    return { ...project, sites, materials, installedAssets: assets, notes, history };
  }

  async getProjectBilling(projectId: number) {
    const project = await this.getProjectHeader(projectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', 'Project not found');
    }
    if (project.status === 'cancelled') {
      return { project, materials: [] };
    }

    const [materials] = await pool.execute<RowDataPacket[]>(
      `SELECT
         m.id AS project_material_id,
         m.project_id,
         m.product_id,
         m.product_name_snapshot,
         m.quantity,
         m.unit_cost_snapshot,
         m.reservation_id,
         m.sales_invoice_id,
         p.sku AS product_sku,
         p.current_sale_price,
         c.default_name AS category_name,
         r.status AS reservation_status,
         CAST(m.quantity * COALESCE(p.current_sale_price, 0) AS DECIMAL(19,4)) AS line_total
       FROM project_materials m
       INNER JOIN catalog_products p ON p.id = m.product_id
       INNER JOIN catalog_categories c ON c.id = p.category_id
       LEFT JOIN inventory_stock_reservations r ON r.id = m.reservation_id
       WHERE m.project_id = ? AND m.sales_invoice_id IS NULL
       ORDER BY m.id`,
      [projectId],
    );

    return { project, materials };
  }

  async addSite(projectId: number, input: ProjectSiteInput, userId: number) {
    await this.requireProject(projectId);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_sites (
         project_id, site_name, address_text, location_notes, contact_name, contact_phone, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        input.siteName,
        nullable(input.addressText),
        nullable(input.locationNotes),
        nullable(input.contactName),
        nullable(input.contactPhone),
        userId,
      ],
    );
    return { id: result.insertId, projectId, ...input };
  }

  async changeStatus(projectId: number, input: ProjectStatusChangeInput, userId: number) {
    const project = await this.requireProject(projectId);
    await pool.execute('UPDATE projects SET status = ? WHERE id = ?', [input.status, projectId]);
    await this.insertStatusHistory(projectId, String(project.status), input.status, input.stageCode ?? null, input.notes ?? null, userId);
    return this.findProject(projectId);
  }

  async addMaterial(projectId: number, input: ProjectMaterialInput, reservationId: number, userId: number) {
    await this.requireProject(projectId);
    const product = await this.requireProduct(input.productId);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_materials (
         project_id, product_id, product_name_snapshot, quantity, unit_cost_snapshot, reservation_id, notes, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        input.productId,
        product.default_name,
        input.quantity,
        product.current_purchase_price,
        reservationId,
        nullable(input.notes),
        userId,
      ],
    );
    return { id: result.insertId, projectId, reservationId, productId: input.productId, quantity: input.quantity };
  }

  async addInstalledAsset(projectId: number, input: InstalledAssetInput, userId: number) {
    await this.requireProject(projectId);
    if (input.siteId) await this.requireSite(projectId, input.siteId);
    if (input.productId) await this.requireProduct(input.productId);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_installed_assets (
         project_id, site_id, product_id, asset_type, asset_name, serial_no, ip_address, mac_address,
         installation_notes, installed_at, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        nullable(input.siteId),
        nullable(input.productId),
        input.assetType,
        input.assetName,
        nullable(input.serialNo),
        nullable(input.ipAddress),
        nullable(input.macAddress),
        nullable(input.installationNotes),
        nullable(input.installedAt),
        userId,
      ],
    );
    return { id: result.insertId, projectId, ...input };
  }

  async addNote(projectId: number, input: ProjectNoteInput, userId: number) {
    await this.requireProject(projectId);
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO project_notes (project_id, note_text, created_by_user_id) VALUES (?, ?, ?)',
      [projectId, input.noteText, userId],
    );
    return { id: result.insertId, projectId, noteText: input.noteText };
  }

  async summary(projectId: number) {
    const project = await this.findProject(projectId);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');
    const projectRow = project as unknown as { customer_id: number | null; project_type_id: number | null };
    const [customers] = projectRow.customer_id
      ? await pool.execute<RowDataPacket[]>('SELECT * FROM crm_customers WHERE id = ?', [Number(projectRow.customer_id)])
      : [[] as RowDataPacket[]];
    const [types] = projectRow.project_type_id
      ? await pool.execute<RowDataPacket[]>('SELECT * FROM project_types WHERE id = ?', [Number(projectRow.project_type_id)])
      : [[] as RowDataPacket[]];
    return { project, customer: customers[0] ?? null, projectType: types[0] ?? null };
  }

  async requireProject(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM projects WHERE id = ? LIMIT 1', [id]);
    const project = rows[0];
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');
    return project;
  }

  async requireProduct(id: number) {
    const [rows] = await pool.execute<Array<RowDataPacket & { default_name: string; current_purchase_price: string }>>(
      'SELECT * FROM catalog_products WHERE id = ? AND is_active = TRUE',
      [id],
    );
    const product = rows[0];
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    return product;
  }

  async getProjectHeader(id: number) {
    const [rows] = await pool.execute<ProjectHeaderRow[]>(
      `SELECT
         p.id,
         p.project_code,
         p.customer_id,
         c.customer_code,
         c.name AS customer_name,
         p.title,
         p.status
       FROM projects p
       LEFT JOIN crm_customers c ON c.id = p.customer_id
       WHERE p.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async requireType(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM project_types WHERE id = ? AND is_active = TRUE', [id]);
    if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Project type not found');
  }

  private async requireCustomer(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM crm_customers WHERE id = ? AND is_active = TRUE', [id]);
    if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Customer not found');
  }

  private async requireUser(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM auth_users WHERE id = ? AND status = "active"', [id]);
    if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  private async requireSite(projectId: number, siteId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM project_sites WHERE id = ? AND project_id = ?', [siteId, projectId]);
    if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Project site not found');
  }

  private async insertStatusHistory(
    projectId: number,
    fromStatus: string | null,
    toStatus: ProjectStatus,
    stageCode: string | null,
    notes: string | null,
    userId: number,
  ) {
    await pool.execute(
      `INSERT INTO project_status_history (
         project_id, from_status, to_status, stage_code, notes, changed_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, fromStatus, toStatus, stageCode, notes, userId],
    );
  }

  private async nextProjectCode() {
    const [rows] = await pool.query<Array<RowDataPacket & { next_id: number }>>(
      'SELECT AUTO_INCREMENT AS next_id FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "projects"',
    );
    return `PRJ-${String(rows[0]?.next_id ?? Date.now()).padStart(6, '0')}`;
  }
}
