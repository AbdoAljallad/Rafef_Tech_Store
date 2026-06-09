import { ApiError } from '../../../shared/api/apiErrors';
import { PERMISSIONS } from '../../../shared/permissions/permissionCodes';
import type { CurrentUser, CurrentUserResponse, LoginRequest, LoginResponse, SelfProfileResponse, UpdateProfileRequest } from '../types/auth.types';

const MOCK_SESSION_KEY = 'rafef_tech_mock_auth_session';
const MOCK_ACCESS_TOKEN = 'mock-dev-token';

let mockUser: CurrentUser = {
  id: 1,
  username: 'admin',
  displayName: 'Администратор',
  role: {
    id: 1,
    code: 'owner_admin',
    nameRu: 'Владелец / Администратор',
  },
  avatarInitials: 'RT',
  avatarUrl: null,
  lastLoginAt: new Date().toISOString(),
  maxDiscountPercent: 100,
  permissions: Object.values(PERMISSIONS),
};

function delay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 160);
  });
}

function hasMockSession() {
  return localStorage.getItem(MOCK_SESSION_KEY) === 'true';
}

function buildProfile(): SelfProfileResponse {
  return {
    profile: {
      ...mockUser,
      status: 'active',
      recentActivity: [
        {
          id: 1,
          actionCode: 'auth.login',
          module: 'auth',
          entityType: 'auth_sessions',
          entityId: 1,
          createdAt: new Date().toISOString(),
          ipAddress: '127.0.0.1',
        },
      ],
    },
  };
}

export const mockAuthApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    await delay();

    if (payload.username === 'admin' && payload.password === 'admin123') {
      localStorage.setItem(MOCK_SESSION_KEY, 'true');
      mockUser = {
        ...mockUser,
        lastLoginAt: new Date().toISOString(),
      };
      return {
        user: mockUser,
        accessToken: MOCK_ACCESS_TOKEN,
      };
    }

    throw new ApiError(401, {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid mock credentials',
    });
  },

  async logout(): Promise<void> {
    await delay();
    localStorage.removeItem(MOCK_SESSION_KEY);
  },

  async me(): Promise<CurrentUserResponse> {
    await delay();

    if (hasMockSession()) {
      return {
        user: mockUser,
      };
    }

    throw new ApiError(401, {
      code: 'AUTH_REQUIRED',
      message: 'Mock session is not active',
    });
  },

  async profile(): Promise<SelfProfileResponse> {
    await delay();

    if (!hasMockSession()) {
      throw new ApiError(401, {
        code: 'AUTH_REQUIRED',
        message: 'Mock session is not active',
      });
    }

    return buildProfile();
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<SelfProfileResponse> {
    await delay();

    if (!hasMockSession()) {
      throw new ApiError(401, {
        code: 'AUTH_REQUIRED',
        message: 'Mock session is not active',
      });
    }

    mockUser = {
      ...mockUser,
      username: payload.username,
      displayName: payload.displayName,
      avatarUrl: payload.avatarUrl ?? null,
    };

    return buildProfile();
  },
};
