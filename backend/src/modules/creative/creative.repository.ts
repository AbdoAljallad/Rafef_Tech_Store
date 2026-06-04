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

  async createJob(input: { jobCode: string; jobTypeId?: number | null; title: string; description?: string | null; deadlineAt?: string | null; createdBy?: number | null }) {
    const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO creative_jobs (job_code, job_type_id, title, description, deadline_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`, [input.jobCode, input.jobTypeId ?? null, input.title, input.description ?? null, input.deadlineAt ?? null, input.createdBy ?? null]);
    return { id: result.insertId, job_code: input.jobCode } as any;
  }

  async listJobs() {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, job_code, title, status, deadline_at AS deadline, created_at
       FROM creative_jobs
       ORDER BY created_at DESC, id DESC`,
    );
    return rows;
  }

  async getJob(id: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM creative_jobs WHERE id = ?`, [id]);
    const job = rows[0];
    if (!job) return null;
    const [lines] = await pool.execute<RowDataPacket[]>(`SELECT * FROM creative_job_lines WHERE job_id = ? ORDER BY id`, [id]);
    const [vendorTasks] = await pool.execute<RowDataPacket[]>(`SELECT * FROM creative_vendor_tasks WHERE job_id = ? ORDER BY id`, [id]);
    const [history] = await pool.execute<RowDataPacket[]>(`SELECT * FROM creative_job_status_history WHERE job_id = ? ORDER BY id`, [id]);
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
