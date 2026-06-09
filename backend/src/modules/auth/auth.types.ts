export type UserRole = {
  id: number;
  code: string;
  nameRu: string;
};

export type AuthenticatedUser = {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  permissions: string[];
  maxDiscountPercent: number | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
};

export type UserActivityEntry = {
  id: number;
  actionCode: string;
  module: string;
  entityType: string | null;
  entityId: number | null;
  createdAt: string;
  ipAddress: string | null;
};

export type UserProfile = AuthenticatedUser & {
  status: 'active' | 'disabled' | 'locked';
  recentActivity: UserActivityEntry[];
};

export type LoginResult = {
  user: AuthenticatedUser;
  rawSessionToken: string;
  expiresAt: Date;
};
