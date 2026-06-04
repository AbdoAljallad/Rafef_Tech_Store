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
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  user: CurrentUser;
  accessToken?: string;
};

export type CurrentUserResponse = {
  user: CurrentUser;
};
