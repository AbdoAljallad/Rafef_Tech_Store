import { httpClient } from '../../../shared/api/httpClient';

export type CreateUserRequest = {
  username: string;
  password: string;
  displayName: string;
  roleId: number;
  status: 'active' | 'disabled' | 'locked';
  maxDiscountPercent: number | null;
};

export const adminApi = {
  users() { return httpClient.get<{ items: any[] }>('/api/admin/users'); },
  createUser(payload: CreateUserRequest) { return httpClient.post<{ user: { id: number } }>('/api/admin/users', payload); },
  roles() { return httpClient.get<{ items: any[] }>('/api/admin/roles'); },
  permissions() { return httpClient.get<{ items: any[] }>('/api/admin/permissions'); },
  settings() { return httpClient.get<{ settings: any }>('/api/admin/settings'); },
};
