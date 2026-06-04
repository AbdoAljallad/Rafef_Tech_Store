import { httpClient } from '../../../shared/api/httpClient';

export const integrationsApi = {
  health() {
    return httpClient.get<{ health: { services: any[] } }>('/api/integrations/health');
  },
  outbox() {
    return httpClient.get<{ items: any[] }>('/api/integrations/webhook-outbox');
  },
};
