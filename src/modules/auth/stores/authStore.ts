import { create } from 'zustand';
import { setAccessToken } from '../../../shared/api/authToken';
import { authApi } from '../api/auth.api';
import type { AuthStatus, CurrentUser, LoginRequest } from '../types/auth.types';

type AuthState = {
  status: AuthStatus;
  user: CurrentUser | null;
  permissions: Set<string>;
  isLoading: boolean;
  errorCode: string | null;
  restoreSession: () => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

function permissionsToSet(user: CurrentUser | null) {
  return new Set(user?.permissions ?? []);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  user: null,
  permissions: new Set<string>(),
  isLoading: false,
  errorCode: null,

  async restoreSession() {
    if (get().status !== 'unknown') {
      return;
    }

    set({ isLoading: true, errorCode: null });

    try {
      const response = await authApi.me();
      set({
        status: 'authenticated',
        user: response.user,
        permissions: permissionsToSet(response.user),
        isLoading: false,
      });
    } catch {
      setAccessToken(null);
      set({
        status: 'unauthenticated',
        user: null,
        permissions: new Set<string>(),
        isLoading: false,
      });
    }
  },

  async login(payload) {
    set({ isLoading: true, errorCode: null });

    try {
      const response = await authApi.login(payload);
      setAccessToken(response.accessToken ?? null);
      set({
        status: 'authenticated',
        user: response.user,
        permissions: permissionsToSet(response.user),
        isLoading: false,
      });
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR';
      set({
        status: 'unauthenticated',
        user: null,
        permissions: new Set<string>(),
        isLoading: false,
        errorCode: code,
      });
      throw error;
    }
  },

  async logout() {
    set({ isLoading: true });

    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({
        status: 'unauthenticated',
        user: null,
        permissions: new Set<string>(),
        isLoading: false,
        errorCode: null,
      });
    }
  },

  hasPermission(permission) {
    return get().permissions.has(permission);
  },
}));
