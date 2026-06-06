import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

export type WebhookOutboxRow = RowDataPacket & {
  id: number;
  target: string;
  webhook_url: string | null;
  event_type: string;
  payload_json: unknown;
  attempts: number;
};

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

  async createOutbox(input: {
    target: string;
    webhookUrl?: string | null;
    eventType: string;
    payload: unknown;
    createdByUserId?: number | null;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO integration_webhook_outbox (target, webhook_url, event_type, payload_json, created_by_user_id)
       VALUES (?, ?, ?, CAST(? AS JSON), ?)`,
      [
        input.target,
        input.webhookUrl ?? null,
        input.eventType,
        JSON.stringify(input.payload),
        input.createdByUserId ?? null,
      ],
    );
    return result.insertId;
  }

  async claimPending(limit = 10) {
    const [rows] = await pool.query<WebhookOutboxRow[]>(
      `SELECT id, target, webhook_url, event_type, payload_json, attempts
       FROM integration_webhook_outbox
       WHERE status IN ('pending', 'failed')
         AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
       ORDER BY created_at ASC, id ASC
       LIMIT ${Math.max(1, Math.min(limit, 50))}`,
    );

    if (rows.length === 0) return [];

    await pool.query(
      `UPDATE integration_webhook_outbox
       SET status = 'processing'
       WHERE id IN (${rows.map(() => '?').join(',')})`,
      rows.map((row) => row.id),
    );

    return rows;
  }

  async markSent(id: number) {
    await pool.execute(
      `UPDATE integration_webhook_outbox
       SET status = 'sent', attempts = attempts + 1, last_error = NULL, processed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id],
    );
  }

  async markFailed(id: number, error: string) {
    await pool.execute(
      `UPDATE integration_webhook_outbox
       SET status = 'failed',
           attempts = attempts + 1,
           last_error = ?,
           next_attempt_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL LEAST(60, POW(2, attempts + 1)) MINUTE)
       WHERE id = ?`,
      [error.slice(0, 2000), id],
    );
  }
}
