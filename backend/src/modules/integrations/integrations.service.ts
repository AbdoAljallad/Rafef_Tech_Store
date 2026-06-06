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
      signal: AbortSignal.timeout(env.INTEGRATION_HTTP_TIMEOUT_MS),
    });

    return {
      key: 'openclaw',
      status: response.ok ? 'ok' : 'error',
      gatewayConfigured: true,
    };
  } catch {
    return { key: 'openclaw', status: 'error', gatewayConfigured: true };
  }
}

async function checkN8n() {
  if (!env.N8N_WEBHOOK_URL && !env.N8N_HEALTH_URL) {
    return { key: 'n8n', status: 'not_configured', webhookConfigured: false, healthConfigured: false };
  }

  if (!env.N8N_HEALTH_URL) {
    return { key: 'n8n', status: 'configured', webhookConfigured: Boolean(env.N8N_WEBHOOK_URL), healthConfigured: false };
  }

  try {
    const response = await fetch(env.N8N_HEALTH_URL, {
      signal: AbortSignal.timeout(env.INTEGRATION_HTTP_TIMEOUT_MS),
    });

    return {
      key: 'n8n',
      status: response.ok ? 'ok' : 'error',
      webhookConfigured: Boolean(env.N8N_WEBHOOK_URL),
      healthConfigured: true,
    };
  } catch {
    return { key: 'n8n', status: 'error', webhookConfigured: Boolean(env.N8N_WEBHOOK_URL), healthConfigured: true };
  }
}

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
        await checkN8n(),
        await checkOpenClaw(),
        { key: 'webhook_outbox', ...(await this.worker.status()) },
      ],
    };
  }

  outbox() {
    return this.repo.listOutbox();
  }

  async enqueueN8nTest(actorUserId: number) {
    const id = await this.repo.createOutbox({
      target: 'n8n',
      webhookUrl: env.N8N_WEBHOOK_URL || null,
      eventType: 'integration.test',
      payload: {
        source: 'rafef-tech',
        message: 'Rafef Tech n8n integration test',
        createdAt: new Date().toISOString(),
      },
      createdByUserId: actorUserId,
    });

    return { id, delivery: await this.worker.processPending(1) };
  }

  processOutbox(limit?: number) {
    return this.worker.processPending(limit);
  }

  acceptN8nInbound(input: unknown) {
    return {
      accepted: true,
      source: 'n8n',
      receivedAt: new Date().toISOString(),
      payload: input,
    };
  }
}
