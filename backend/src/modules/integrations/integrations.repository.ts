import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

export class IntegrationsRepository {
  async outboxStats() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) count
       FROM integration_webhook_outbox
       GROUP BY status`,
    );
    return rows;
  }

  async listOutbox() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, target, event_type, status, attempts, last_error, created_at, processed_at
       FROM integration_webhook_outbox
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
    );
    return rows;
  }
}
