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
};

export type LoginResult = {
  user: AuthenticatedUser;
  rawSessionToken: string;
  expiresAt: Date;
};
