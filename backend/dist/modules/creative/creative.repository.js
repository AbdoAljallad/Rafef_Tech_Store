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
        const [result] = await pool.execute(`INSERT INTO creative_jobs (
         job_code,
         job_type_id,
         customer_id,
         title,
         description,
         deadline_at,
         created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            input.jobCode,
            input.jobTypeId ?? null,
            input.customerId ?? null,
            input.title,
            input.description ?? null,
            input.deadlineAt ?? null,
            input.createdBy ?? null,
        ]);
        return { id: result.insertId, job_code: input.jobCode };
    }
    async listJobs() {
        const [rows] = await pool.execute(`SELECT
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
         COALESCE(lines.line_count, 0) AS line_count,
         COALESCE(tasks.vendor_task_count, 0) AS vendor_task_count
       FROM creative_jobs j
       LEFT JOIN creative_job_types jt ON jt.id = j.job_type_id
       LEFT JOIN crm_customers c ON c.id = j.customer_id
       LEFT JOIN (
         SELECT job_id, COUNT(*) AS line_count
         FROM creative_job_lines
         GROUP BY job_id
       ) lines ON lines.job_id = j.id
       LEFT JOIN (
         SELECT job_id, COUNT(*) AS vendor_task_count
         FROM creative_vendor_tasks
         GROUP BY job_id
       ) tasks ON tasks.job_id = j.id
       ORDER BY created_at DESC, id DESC`);
        return rows;
    }
    async getJob(id) {
        const [rows] = await pool.execute(`SELECT
         j.*,
         jt.default_name AS job_type_name,
         c.customer_code,
         c.name AS customer_name
       FROM creative_jobs j
       LEFT JOIN creative_job_types jt ON jt.id = j.job_type_id
       LEFT JOIN crm_customers c ON c.id = j.customer_id
       WHERE j.id = ?`, [id]);
        const job = rows[0];
        if (!job)
            return null;
        const [lines] = await pool.execute(`SELECT *, quantity * COALESCE(unit_price, 0) AS line_total
       FROM creative_job_lines
       WHERE job_id = ?
       ORDER BY id DESC`, [id]);
        const [vendorTasks] = await pool.execute(`SELECT vt.*, v.name AS vendor_name, v.code AS vendor_code
       FROM creative_vendor_tasks vt
       LEFT JOIN creative_vendors v ON v.id = vt.vendor_id
       WHERE vt.job_id = ?
       ORDER BY vt.id DESC`, [id]);
        const [history] = await pool.execute(`SELECT *
       FROM creative_job_status_history
       WHERE job_id = ?
       ORDER BY id DESC`, [id]);
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
