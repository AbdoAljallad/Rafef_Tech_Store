export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export type UserRole = {
  id: number;
  code: string;
  nameRu: string;
};

export type CurrentUser = {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  permissions: string[];
  maxDiscountPercent: number | null;
  avatarInitials?: string | null;
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

export type SelfProfile = CurrentUser & {
  status: 'active' | 'disabled' | 'locked';
  recentActivity: UserActivityEntry[];
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type UpdateProfileRequest = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

export type LoginResponse = {
  user: CurrentUser;
  accessToken?: string;
};

export type CurrentUserResponse = {
  user: CurrentUser;
};

export type SelfProfileResponse = {
  profile: SelfProfile;
};
