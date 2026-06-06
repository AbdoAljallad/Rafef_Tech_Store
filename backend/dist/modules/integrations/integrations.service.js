import { env } from '../../config/env.js';
import { pool } from '../../database/mysql.js';
import { IntegrationsRepository } from './integrations.repository.js';
import { WebhookOutboxWorker } from './webhookOutbox.worker.js';
async function checkOpenClaw() {
    if (!env.OPENCLAW_GATEWAY_URL) {
        return { key: 'openclaw', status: 'not_configured', gatewayConfigured: false };
    }
    try {
        const response = await fetch(new URL('/health', env.OPENCLAW_GATEWAY_URL), {
            signal: AbortSignal.timeout(3000),
        });
        return {
            key: 'openclaw',
            status: response.ok ? 'ok' : 'error',
            gatewayConfigured: true,
        };
    }
    catch {
        return { key: 'openclaw', status: 'error', gatewayConfigured: true };
    }
}
export class IntegrationsService {
    repo;
    worker;
    constructor(repo = new IntegrationsRepository(), worker = new WebhookOutboxWorker(repo)) {
        this.repo = repo;
        this.worker = worker;
    }
    async health() {
        let database = 'ok';
        try {
            await pool.query('SELECT 1');
        }
        catch {
            database = 'error';
        }
        return {
            services: [
                { key: 'database', status: database },
                { key: 'n8n', status: env.N8N_WEBHOOK_URL ? 'configured' : 'not_configured', webhookConfigured: Boolean(env.N8N_WEBHOOK_URL) },
                await checkOpenClaw(),
                { key: 'webhook_outbox', ...(await this.worker.status()) },
            ],
        };
    }
    outbox() {
        return this.repo.listOutbox();
    }
}
