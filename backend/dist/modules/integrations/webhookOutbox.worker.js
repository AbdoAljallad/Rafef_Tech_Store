import { env } from '../../config/env.js';
import { IntegrationsRepository } from './integrations.repository.js';
export class WebhookOutboxWorker {
    repo;
    constructor(repo = new IntegrationsRepository()) {
        this.repo = repo;
    }
    async status() {
        return {
            name: 'webhook_outbox_worker',
            status: env.N8N_WEBHOOK_URL ? 'ready' : 'not_configured',
            mode: 'manual',
            stats: await this.repo.outboxStats(),
        };
    }
    async processPending(limit = 10) {
        if (!env.N8N_WEBHOOK_URL) {
            return { processed: 0, sent: 0, failed: 0, skipped: true };
        }
        const rows = await this.repo.claimPending(limit);
        let sent = 0;
        let failed = 0;
        for (const row of rows) {
            try {
                await this.send(row);
                await this.repo.markSent(row.id);
                sent += 1;
            }
            catch (error) {
                await this.repo.markFailed(row.id, error instanceof Error ? error.message : 'Unknown webhook error');
                failed += 1;
            }
        }
        return { processed: rows.length, sent, failed, skipped: false };
    }
    async send(row) {
        const webhookUrl = row.webhook_url || env.N8N_WEBHOOK_URL;
        const payload = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rafef-Event-Type': row.event_type,
                'X-Rafef-Outbox-Id': String(row.id),
                ...(env.N8N_SHARED_SECRET ? { 'X-Rafef-Integration-Secret': env.N8N_SHARED_SECRET } : {}),
            },
            body: JSON.stringify({
                id: row.id,
                target: row.target,
                eventType: row.event_type,
                payload,
            }),
            signal: AbortSignal.timeout(env.INTEGRATION_HTTP_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`n8n webhook failed with HTTP ${response.status}`);
        }
    }
}
