import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

export class CreativeRepository {
  async createJobType(input: { code: string; defaultName: string; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO creative_job_types (code, default_name, created_by_user_id) VALUES (?, ?, ?)`, [input.code, input.defaultName, input.createdBy ?? null]);
    return { id: result.insertId, code: input.code, default_name: input.defaultName } as any;
  }

  async listJobTypes() {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM creative_job_types ORDER BY id DESC`);
    return rows;
  }

  async createVendor(input: { code: string; name: string; contact?: any; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO creative_vendors (code, name, contact, created_by_user_id) VALUES (?, ?, ?, ?)`, [input.code, input.name, input.contact ? JSON.stringify(input.contact) : null, input.createdBy ?? null]);
    return { id: result.insertId, code: input.code, name: input.name } as any;
  }

  async listVendors() {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM creative_vendors ORDER BY id DESC`);
    return rows;
  }

  async createJob(input: {
    jobCode: string;
    jobTypeId?: number | null;
    customerId?: number | null;
    title: string;
    description?: string | null;
    deadlineAt?: string | null;
    createdBy?: number | null;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO creative_jobs (
         job_code,
         job_type_id,
         customer_id,
         title,
         description,
         deadline_at,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.jobCode,
        input.jobTypeId ?? null,
        input.customerId ?? null,
        input.title,
        input.description ?? null,
        input.deadlineAt ?? null,
        input.createdBy ?? null,
      ],
    );
    return { id: result.insertId, job_code: input.jobCode } as any;
  }

  async listJobs() {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         j.id,
         j.job_code,
         j.job_type_id,
         j.customer_id,
         jt.default_name AS job_type_name,
         c.customer_code,
         c.name AS customer_name,
         j.title,
         j.status,
         j.deadline_at AS deadline,
         j.created_at,
         COALESCE(job_lines_agg.line_count, 0) AS line_count,
         COALESCE(vendor_tasks_agg.vendor_task_count, 0) AS vendor_task_count
       FROM creative_jobs j
       LEFT JOIN creative_job_types jt ON jt.id = j.job_type_id
       LEFT JOIN crm_customers c ON c.id = j.customer_id
       LEFT JOIN (
         SELECT job_id, COUNT(*) AS line_count
         FROM creative_job_lines
         GROUP BY job_id
       ) AS job_lines_agg ON job_lines_agg.job_id = j.id
       LEFT JOIN (
         SELECT job_id, COUNT(*) AS vendor_task_count
         FROM creative_vendor_tasks
         GROUP BY job_id
       ) AS vendor_tasks_agg ON vendor_tasks_agg.job_id = j.id
       ORDER BY j.created_at DESC, j.id DESC`,
    );
    return rows;
  }

  async getJob(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         j.*,
         jt.default_name AS job_type_name,
         c.customer_code,
         c.name AS customer_name
       FROM creative_jobs j
       LEFT JOIN creative_job_types jt ON jt.id = j.job_type_id
       LEFT JOIN crm_customers c ON c.id = j.customer_id
       WHERE j.id = ?`,
      [id],
    );
    const job = rows[0];
    if (!job) return null;
    const [lines] = await pool.execute<RowDataPacket[]>(
      `SELECT *, quantity * COALESCE(unit_price, 0) AS line_total
       FROM creative_job_lines
       WHERE job_id = ?
       ORDER BY id DESC`,
      [id],
    );
    const [vendorTasks] = await pool.execute<RowDataPacket[]>(
      `SELECT vt.*, v.name AS vendor_name, v.code AS vendor_code
       FROM creative_vendor_tasks vt
       LEFT JOIN creative_vendors v ON v.id = vt.vendor_id
       WHERE vt.job_id = ?
       ORDER BY vt.id DESC`,
      [id],
    );
    const [history] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM creative_job_status_history
       WHERE job_id = ?
       ORDER BY id DESC`,
      [id],
    );
    return { ...job, lines, vendorTasks, history };
  }

  async addJobLine(input: { jobId: number; lineType?: string | null; description?: string | null; quantity?: number; unitPrice?: number | null; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO creative_job_lines (job_id, line_type, description, quantity, unit_price, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`, [input.jobId, input.lineType ?? null, input.description ?? null, input.quantity ?? 1, input.unitPrice ?? null, input.createdBy ?? null]);
    return this.getJob(input.jobId);
  }

  async createVendorTask(input: { vendorId: number; jobId: number; externalTaskCode?: string | null; notes?: string | null; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO creative_vendor_tasks (vendor_id, job_id, external_task_code, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?)`, [input.vendorId, input.jobId, input.externalTaskCode ?? null, input.notes ?? null, input.createdBy ?? null]);
    return { id: result.insertId } as any;
  }

  async changeJobStatus(jobId: number, fromStatus: string | null, toStatus: string, notes?: string | null, changedBy?: number | null) {
    await pool.execute(`UPDATE creative_jobs SET status = ? WHERE id = ?`, [toStatus, jobId]);
    await pool.execute<ResultSetHeader>(`INSERT INTO creative_job_status_history (job_id, from_status, to_status, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?)`, [jobId, fromStatus, toStatus, notes ?? null, changedBy ?? null]);
    return this.getJob(jobId);
  }
}
