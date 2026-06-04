import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthRepository } from './auth.repository.js';
import type { AuthenticatedUser, LoginResult } from './auth.types.js';

export class AuthService {
  constructor(
    private readonly authRepository = new AuthRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async login(params: {
    username: string;
    password: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<LoginResult> {
    const userRow = await this.authRepository.findUserByUsername(params.username);

    if (!userRow || userRow.status !== 'active') {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(params.password, userRow.password_hash);

    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const permissions = await this.authRepository.getUserPermissions(userRow.id);
    const rawSessionToken = crypto.randomBytes(32).toString('base64url');
    const sessionTokenHash = this.hashSessionToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

    const sessionId = await this.authRepository.createSession({
      userId: userRow.id,
      sessionTokenHash,
      expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await this.authRepository.updateLastLogin(userRow.id);
    await this.auditService.log({
      actorUserId: userRow.id,
      actionCode: 'auth.login',
      module: 'auth',
      entityType: 'auth_sessions',
      entityId: sessionId,
      ipAddress: params.ipAddress,
    });

    return {
      rawSessionToken,
      expiresAt,
      user: this.mapUser(userRow, permissions),
    };
  }

  async getCurrentUser(rawSessionToken: string): Promise<{ user: AuthenticatedUser; sessionId: number }> {
    const session = await this.authRepository.findActiveSessionByTokenHash(this.hashSessionToken(rawSessionToken));

    if (!session) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await this.authRepository.expireSession(session.id);
      throw new AppError(401, 'AUTH_REQUIRED', 'Session expired');
    }

    const userRow = await this.authRepository.findUserById(session.user_id);

    if (!userRow || userRow.status !== 'active') {
      throw new AppError(401, 'AUTH_REQUIRED', 'User is not active');
    }

    const permissions = await this.authRepository.getUserPermissions(userRow.id);
    return {
      sessionId: session.id,
      user: this.mapUser(userRow, permissions),
    };
  }

  async logout(params: { rawSessionToken?: string; actorUserId?: number; ipAddress?: string | null }) {
    if (!params.rawSessionToken) {
      return;
    }

    const session = await this.authRepository.findActiveSessionByTokenHash(this.hashSessionToken(params.rawSessionToken));
    if (!session) {
      return;
    }

    await this.authRepository.endSession(session.id);
    await this.auditService.log({
      actorUserId: params.actorUserId ?? session.user_id,
      actionCode: 'auth.logout',
      module: 'auth',
      entityType: 'auth_sessions',
      entityId: session.id,
      ipAddress: params.ipAddress,
    });
  }

  hashSessionToken(rawToken: string) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private mapUser(
    row: {
      id: number;
      username: string;
      display_name: string;
      avatar_url: string | null;
      max_discount_percent: string | null;
      role_id: number;
      role_code: string;
      role_name_ru: string;
    },
    permissions: string[],
  ): AuthenticatedUser {
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      maxDiscountPercent: row.max_discount_percent === null ? null : Number(row.max_discount_percent),
      permissions,
      role: {
        id: row.role_id,
        code: row.role_code,
        nameRu: row.role_name_ru,
      },
    };
  }
}
