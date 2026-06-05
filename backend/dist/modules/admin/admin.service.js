import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminRepository } from './admin.repository.js';
export class AdminService {
    repo;
    audit;
    constructor(repo = new AdminRepository(), audit = new AuditService()) {
        this.repo = repo;
        this.audit = audit;
    }
    users() { return this.repo.users(); }
    roles() { return this.repo.roles(); }
    permissions() { return this.repo.permissions(); }
    settings() { return this.repo.settings(); }
    async createUser(params) {
        const role = await this.repo.findActiveRole(params.roleId);
        if (!role) {
            throw new AppError(400, 'ROLE_NOT_FOUND', 'Selected role does not exist or is inactive');
        }
        const passwordHash = await bcrypt.hash(params.password, 12);
        const userId = await this.repo.createUser({
            username: params.username,
            passwordHash,
            displayName: params.displayName,
            roleId: params.roleId,
            status: params.status,
            maxDiscountPercent: params.maxDiscountPercent,
        });
        await this.audit.log({
            actorUserId: params.actorUserId,
            actionCode: 'auth.user.create',
            module: 'auth',
            entityType: 'auth_users',
            entityId: userId,
            newValues: {
                username: params.username,
                displayName: params.displayName,
                roleId: params.roleId,
                status: params.status,
                maxDiscountPercent: params.maxDiscountPercent ?? null,
            },
            ipAddress: params.ipAddress,
        });
        return { id: userId };
    }
}
