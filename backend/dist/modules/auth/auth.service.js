import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthRepository } from './auth.repository.js';
export class AuthService {
    authRepository;
    auditService;
    constructor(authRepository = new AuthRepository(), auditService = new AuditService()) {
        this.authRepository = authRepository;
        this.auditService = auditService;
    }
    async login(params) {
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
    async getCurrentUser(rawSessionToken) {
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
    async getOwnProfile(userId) {
        const userRow = await this.authRepository.findUserById(userId);
        if (!userRow) {
            throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
        }
        const [permissions, activity] = await Promise.all([
            this.authRepository.getUserPermissions(userId),
            this.authRepository.getRecentActivity(userId),
        ]);
        return {
            ...this.mapUser(userRow, permissions),
            status: userRow.status,
            recentActivity: activity.map((entry) => ({
                id: entry.id,
                actionCode: entry.action_code,
                module: entry.module,
                entityType: entry.entity_type,
                entityId: entry.entity_id,
                createdAt: entry.created_at.toISOString(),
                ipAddress: entry.ip_address,
            })),
        };
    }
    async updateOwnProfile(userId, params) {
        const existing = await this.authRepository.findUserById(userId);
        if (!existing) {
            throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
        }
        let passwordHash = null;
        if (params.newPassword) {
            if (!params.currentPassword) {
                throw new AppError(400, 'CURRENT_PASSWORD_REQUIRED', 'Current password is required');
            }
            const isCurrentPasswordValid = await bcrypt.compare(params.currentPassword, existing.password_hash);
            if (!isCurrentPasswordValid) {
                throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'Current password is invalid');
            }
            passwordHash = await bcrypt.hash(params.newPassword, 12);
        }
        await this.authRepository.updateOwnProfile(userId, {
            username: params.username,
            displayName: params.displayName,
            avatarUrl: params.avatarUrl,
            passwordHash,
        });
        await this.auditService.log({
            actorUserId: userId,
            actionCode: 'auth.profile.update',
            module: 'auth',
            entityType: 'auth_users',
            entityId: userId,
            oldValues: {
                username: existing.username,
                displayName: existing.display_name,
                avatarUrl: existing.avatar_url ? '[stored]' : null,
            },
            newValues: {
                username: params.username,
                displayName: params.displayName,
                avatarUpdated: params.avatarUrl !== existing.avatar_url,
                passwordChanged: Boolean(params.newPassword),
            },
            ipAddress: params.ipAddress,
        });
        return this.getOwnProfile(userId);
    }
    async logout(params) {
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
    hashSessionToken(rawToken) {
        return crypto.createHash('sha256').update(rawToken).digest('hex');
    }
    mapUser(row, permissions) {
        return {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
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
