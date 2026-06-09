import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminRepository } from './admin.repository.js';

export class AdminService {
  constructor(
    private readonly repo = new AdminRepository(),
    private readonly audit = new AuditService(),
  ) {}

  users() { return this.repo.users(); }
  roles() { return this.repo.roles(); }
  permissions() { return this.repo.permissions(); }
  settings() { return this.repo.settings(); }

  async user(userId: number) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return {
      ...user,
      permissionIds: await this.repo.getUserPermissionIds(userId),
    };
  }

  async createUser(params: {
    username: string;
    password: string;
    displayName: string;
    avatarUrl?: string | null;
    roleId: number;
    status: 'active' | 'disabled' | 'locked';
    maxDiscountPercent?: number | null;
    actorUserId?: number | null;
    ipAddress?: string | null;
  }) {
    const role = await this.repo.findActiveRole(params.roleId);
    if (!role) {
      throw new AppError(400, 'ROLE_NOT_FOUND', 'Selected role does not exist or is inactive');
    }

    const passwordHash = await bcrypt.hash(params.password, 12);
    const userId = await this.repo.createUser({
      username: params.username,
      passwordHash,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
      roleId: params.roleId,
      status: params.status,
      maxDiscountPercent: params.maxDiscountPercent,
    });
    await this.repo.applyRoleDefaultPermissions(userId, params.roleId);

    await this.audit.log({
      actorUserId: params.actorUserId,
      actionCode: 'auth.user.create',
      module: 'auth',
      entityType: 'auth_users',
      entityId: userId,
      newValues: {
        username: params.username,
        displayName: params.displayName,
        avatarUpdated: Boolean(params.avatarUrl),
        roleId: params.roleId,
        status: params.status,
        maxDiscountPercent: params.maxDiscountPercent ?? null,
      },
      ipAddress: params.ipAddress,
    });

    return { id: userId };
  }

  async updateUser(
    userId: number,
    params: {
      username: string;
      password?: string;
      displayName: string;
      avatarUrl?: string | null;
      roleId: number;
      status: 'active' | 'disabled' | 'locked';
      maxDiscountPercent?: number | null;
      resetPermissionsToRole?: boolean;
      actorUserId?: number | null;
      ipAddress?: string | null;
    },
  ) {
    const existing = await this.repo.findUserById(userId);
    if (!existing) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (params.actorUserId === userId && params.status !== 'active') {
      throw new AppError(400, 'CANNOT_DISABLE_SELF', 'You cannot disable or lock your own account');
    }

    const role = await this.repo.findActiveRole(params.roleId);
    if (!role) {
      throw new AppError(400, 'ROLE_NOT_FOUND', 'Selected role does not exist or is inactive');
    }

    const passwordHash = params.password ? await bcrypt.hash(params.password, 12) : null;
    await this.repo.updateUser(userId, {
      username: params.username,
      passwordHash,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
      roleId: params.roleId,
      status: params.status,
      maxDiscountPercent: params.maxDiscountPercent,
    });

    if (params.resetPermissionsToRole || Number(existing.role_id) !== params.roleId) {
      await this.repo.applyRoleDefaultPermissions(userId, params.roleId);
    }

    if (params.status !== 'active') {
      await this.repo.revokeUserSessions(userId);
    }

    await this.audit.log({
      actorUserId: params.actorUserId,
      actionCode: 'auth.user.update',
      module: 'auth',
      entityType: 'auth_users',
      entityId: userId,
      oldValues: {
        ...existing,
        avatar_url: existing.avatar_url ? '[stored]' : null,
      },
      newValues: {
        username: params.username,
        displayName: params.displayName,
        avatarUpdated: params.avatarUrl !== existing.avatar_url,
        roleId: params.roleId,
        status: params.status,
        maxDiscountPercent: params.maxDiscountPercent ?? null,
        passwordChanged: Boolean(params.password),
        resetPermissionsToRole: Boolean(params.resetPermissionsToRole),
      },
      ipAddress: params.ipAddress,
    });

    return this.user(userId);
  }

  async deleteUser(userId: number, params: { actorUserId?: number | null; ipAddress?: string | null }) {
    const existing = await this.repo.findUserById(userId);
    if (!existing) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (params.actorUserId === userId) {
      throw new AppError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    }

    await this.repo.disableUser(userId);
    await this.repo.revokeUserSessions(userId);
    await this.audit.log({
      actorUserId: params.actorUserId,
      actionCode: 'auth.user.delete',
      module: 'auth',
      entityType: 'auth_users',
      entityId: userId,
      oldValues: existing,
      newValues: { status: 'disabled' },
      ipAddress: params.ipAddress,
    });
  }

  async updateUserPermissions(
    userId: number,
    params: { permissionIds: number[]; actorUserId?: number | null; ipAddress?: string | null },
  ) {
    const existing = await this.repo.findUserById(userId);
    if (!existing) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const oldPermissionIds = await this.repo.getUserPermissionIds(userId);
    const uniquePermissionIds = Array.from(new Set(params.permissionIds));
    await this.repo.replaceUserPermissions(userId, uniquePermissionIds);
    await this.repo.revokeUserSessions(userId);
    await this.audit.log({
      actorUserId: params.actorUserId,
      actionCode: 'auth.user.permissions.update',
      module: 'auth',
      entityType: 'auth_users',
      entityId: userId,
      oldValues: { permissionIds: oldPermissionIds },
      newValues: { permissionIds: uniquePermissionIds },
      ipAddress: params.ipAddress,
    });

    return this.user(userId);
  }

  async resetUserPermissions(
    userId: number,
    params: { actorUserId?: number | null; ipAddress?: string | null },
  ) {
    const existing = await this.repo.findUserById(userId);
    if (!existing) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const permissionIds = await this.repo.applyRoleDefaultPermissions(userId, Number(existing.role_id));
    await this.repo.revokeUserSessions(userId);
    await this.audit.log({
      actorUserId: params.actorUserId,
      actionCode: 'auth.user.permissions.reset',
      module: 'auth',
      entityType: 'auth_users',
      entityId: userId,
      newValues: { permissionIds },
      ipAddress: params.ipAddress,
    });

    return this.user(userId);
  }
}
