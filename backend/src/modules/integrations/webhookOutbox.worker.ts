import { IntegrationsRepository } from './integrations.repository.js';

export class WebhookOutboxWorker {
  constructor(private readonly repo = new IntegrationsRepository()) {}

  async status() {
    return {
      name: 'webhook_outbox_worker',
      status: 'placeholder',
      mode: 'manual',
      stats: await this.repo.outboxStats(),
    };
  }
}
