import { env } from '../../config/env.js';
import { pool } from '../../database/mysql.js';
import { IntegrationsRepository } from './integrations.repository.js';
import { WebhookOutboxWorker } from './webhookOutbox.worker.js';

export class IntegrationsService {
  constructor(
    private readonly repo = new IntegrationsRepository(),
    private readonly worker = new WebhookOutboxWorker(repo),
  ) {}

  async health() {
    let database: 'ok' | 'error' = 'ok';
    try {
      await pool.query('SELECT 1');
    } catch {
      database = 'error';
    }
    return {
      services: [
        { key: 'database', status: database },
        { key: 'n8n', status: env.N8N_WEBHOOK_URL ? 'configured' : 'not_configured', webhookConfigured: Boolean(env.N8N_WEBHOOK_URL) },
        { key: 'webhook_outbox', ...(await this.worker.status()) },
      ],
    };
  }

  outbox() {
    return this.repo.listOutbox();
  }
}
