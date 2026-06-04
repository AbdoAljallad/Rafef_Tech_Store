import { IntegrationsRepository } from './integrations.repository.js';
export class WebhookOutboxWorker {
    repo;
    constructor(repo = new IntegrationsRepository()) {
        this.repo = repo;
    }
    async status() {
        return {
            name: 'webhook_outbox_worker',
            status: 'placeholder',
            mode: 'manual',
            stats: await this.repo.outboxStats(),
        };
    }
}
