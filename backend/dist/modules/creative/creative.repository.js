import { pool } from '../../database/mysql.js';
export class CreativeRepository {
    async createJobType(input) {
        const [result] = await pool.execute(`INSERT INTO creative_job_types (code, default_name, created_by_user_id) VALUES (?, ?, ?)`, [input.code, input.defaultName, input.createdBy ?? null]);
        return { id: result.insertId, code: input.code, default_name: input.defaultName };
    }
    async listJobTypes() {
        const [rows] = await pool.execute(`SELECT * FROM creative_job_types ORDER BY id DESC`);
        return rows;
    }
    async createVendor(input) {
        const [result] = await pool.execute(`INSERT INTO creative_vendors (code, name, contact, created_by_user_id) VALUES (?, ?, ?, ?)`, [input.code, input.name, input.contact ? JSON.stringify(input.contact) : null, input.createdBy ?? null]);
        return { id: result.insertId, code: input.code, name: input.name };
    }
    async listVendors() {
        const [rows] = await pool.execute(`SELECT * FROM creative_vendors ORDER BY id DESC`);
        return rows;
    }
    async createJob(input) {
        const [result] = await pool.execute(`INSERT INTO creative_jobs (job_code, job_type_id, title, description, deadline_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`, [input.jobCode, input.jobTypeId ?? null, input.title, input.description ?? null, input.deadlineAt ?? null, input.createdBy ?? null]);
        return { id: result.insertId, job_code: input.jobCode };
    }
    async listJobs() {
        const [rows] = await pool.execute(`SELECT id, job_code, title, status, deadline_at AS deadline, created_at
       FROM creative_jobs
       ORDER BY created_at DESC, id DESC`);
        return rows;
    }
    async getJob(id) {
        const [rows] = await pool.execute(`SELECT * FROM creative_jobs WHERE id = ?`, [id]);
        const job = rows[0];
        if (!job)
            return null;
        const [lines] = await pool.execute(`SELECT * FROM creative_job_lines WHERE job_id = ? ORDER BY id`, [id]);
        const [vendorTasks] = await pool.execute(`SELECT * FROM creative_vendor_tasks WHERE job_id = ? ORDER BY id`, [id]);
        const [history] = await pool.execute(`SELECT * FROM creative_job_status_history WHERE job_id = ? ORDER BY id`, [id]);
        return { ...job, lines, vendorTasks, history };
    }
    async addJobLine(input) {
        const [result] = await pool.execute(`INSERT INTO creative_job_lines (job_id, line_type, description, quantity, unit_price, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`, [input.jobId, input.lineType ?? null, input.description ?? null, input.quantity ?? 1, input.unitPrice ?? null, input.createdBy ?? null]);
        return this.getJob(input.jobId);
    }
    async createVendorTask(input) {
        const [result] = await pool.execute(`INSERT INTO creative_vendor_tasks (vendor_id, job_id, external_task_code, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?)`, [input.vendorId, input.jobId, input.externalTaskCode ?? null, input.notes ?? null, input.createdBy ?? null]);
        return { id: result.insertId };
    }
    async changeJobStatus(jobId, fromStatus, toStatus, notes, changedBy) {
        await pool.execute(`UPDATE creative_jobs SET status = ? WHERE id = ?`, [toStatus, jobId]);
        await pool.execute(`INSERT INTO creative_job_status_history (job_id, from_status, to_status, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?)`, [jobId, fromStatus, toStatus, notes ?? null, changedBy ?? null]);
        return this.getJob(jobId);
    }
}
