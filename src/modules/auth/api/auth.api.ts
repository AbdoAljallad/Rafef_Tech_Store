import { API_ENDPOINTS } from '../../../shared/api/endpoints';
import { httpClient } from '../../../shared/api/httpClient';
import { env } from '../../../shared/config/env';
import type { CurrentUserResponse, LoginRequest, LoginResponse, SelfProfileResponse, UpdateProfileRequest } from '../types/auth.types';
import { mockAuthApi } from './mockAuth.api';

export const authApi = {
  login(payload: LoginRequest) {
    if (env.useMockAuth) {
      return mockAuthApi.login(payload);
    }

    return httpClient.post<LoginResponse>(API_ENDPOINTS.auth.login, payload);
  },

  logout() {
    if (env.useMockAuth) {
      return mockAuthApi.logout();
    }

    return httpClient.post<void>(API_ENDPOINTS.auth.logout);
  },

  me() {
    if (env.useMockAuth) {
      return mockAuthApi.me();
    }

    return httpClient.get<CurrentUserResponse>(API_ENDPOINTS.auth.me);
  },

  profile() {
    if (env.useMockAuth) {
      return mockAuthApi.profile();
    }

    return httpClient.get<SelfProfileResponse>('/api/auth/me/profile');
  },

  updateProfile(payload: UpdateProfileRequest) {
    if (env.useMockAuth) {
      return mockAuthApi.updateProfile(payload);
    }

    return httpClient.patch<SelfProfileResponse>('/api/auth/me/profile', payload);
  },
};
