import { httpClient } from '../../../shared/api/httpClient';

export type CreateUserRequest = {
  username: string;
  password: string;
  displayName: string;
  roleId: number;
  status: 'active' | 'disabled' | 'locked';
  maxDiscountPercent: number | null;
};

export type UpdateUserRequest = {
  username: string;
  password?: string;
  displayName: string;
  roleId: number;
  status: 'active' | 'disabled' | 'locked';
  maxDiscountPercent: number | null;
  resetPermissionsToRole?: boolean;
};

export type UpdateUserPermissionsRequest = {
  permissionIds: number[];
};

export const adminApi = {
  users() { return httpClient.get<{ items: any[] }>('/api/admin/users'); },
  user(userId: number) { return httpClient.get<{ user: any }>(`/api/admin/users/${userId}`); },
  createUser(payload: CreateUserRequest) { return httpClient.post<{ user: { id: number } }>('/api/admin/users', payload); },
  updateUser(userId: number, payload: UpdateUserRequest) { return httpClient.patch<{ user: any }>(`/api/admin/users/${userId}`, payload); },
  deleteUser(userId: number) { return httpClient.delete<void>(`/api/admin/users/${userId}`); },
  updateUserPermissions(userId: number, payload: UpdateUserPermissionsRequest) {
    return httpClient.put<{ user: any }>(`/api/admin/users/${userId}/permissions`, payload);
  },
  resetUserPermissions(userId: number) {
    return httpClient.post<{ user: any }>(`/api/admin/users/${userId}/permissions/reset`);
  },
  roles() { return httpClient.get<{ items: any[] }>('/api/admin/roles'); },
  permissions() { return httpClient.get<{ items: any[] }>('/api/admin/permissions'); },
  settings() { return httpClient.get<{ settings: any }>('/api/admin/settings'); },
};
