import { httpClient } from '../../../shared/api/httpClient';

export const adminApi = {
  users() { return httpClient.get<{ items: any[] }>('/api/admin/users'); },
  roles() { return httpClient.get<{ items: any[] }>('/api/admin/roles'); },
  permissions() { return httpClient.get<{ items: any[] }>('/api/admin/permissions'); },
  settings() { return httpClient.get<{ settings: any }>('/api/admin/settings'); },
};
