import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
export class AdminRepository {
    async users() {
        const [rows] = await pool.query(`SELECT u.id, u.username, u.display_name, u.status, u.max_discount_percent, u.last_login_at,
              r.id role_id, r.code role_code, r.name_ru role_name
       FROM auth_users u INNER JOIN auth_roles r ON r.id = u.role_id
       ORDER BY u.id`);
        return rows;
    }
    async findUserById(userId) {
        const [rows] = await pool.execute(`SELECT u.id, u.username, u.display_name, u.status, u.max_discount_percent, u.last_login_at,
              r.id role_id, r.code role_code, r.name_ru role_name
       FROM auth_users u INNER JOIN auth_roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1`, [userId]);
        return rows[0] ?? null;
    }
    async roles() {
        const [rows] = await pool.query('SELECT id, code, name_ru, description, is_active FROM auth_roles ORDER BY id');
        return rows;
    }
    async findActiveRole(roleId) {
        const [rows] = await pool.execute('SELECT id, code, name_ru FROM auth_roles WHERE id = ? AND is_active = TRUE', [
            roleId,
        ]);
        return rows[0] ?? null;
    }
    async createUser(input) {
        try {
            const [result] = await pool.execute(`INSERT INTO auth_users (
           role_id, username, password_hash, display_name, status, max_discount_percent
         )
         VALUES (?, ?, ?, ?, ?, ?)`, [
                input.roleId,
                input.username,
                input.passwordHash,
                input.displayName,
                input.status,
                input.maxDiscountPercent ?? null,
            ]);
            return result.insertId;
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
                throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Username already exists');
            }
            throw error;
        }
    }
    async updateUser(userId, input) {
        try {
            if (input.passwordHash) {
                await pool.execute(`UPDATE auth_users
           SET role_id = ?, username = ?, password_hash = ?, display_name = ?, status = ?, max_discount_percent = ?
           WHERE id = ?`, [
                    input.roleId,
                    input.username,
                    input.passwordHash,
                    input.displayName,
                    input.status,
                    input.maxDiscountPercent ?? null,
                    userId,
                ]);
                return;
            }
            await pool.execute(`UPDATE auth_users
         SET role_id = ?, username = ?, display_name = ?, status = ?, max_discount_percent = ?
         WHERE id = ?`, [input.roleId, input.username, input.displayName, input.status, input.maxDiscountPercent ?? null, userId]);
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
                throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Username already exists');
            }
            throw error;
        }
    }
    async disableUser(userId) {
        await pool.execute(`UPDATE auth_users SET status = 'disabled' WHERE id = ?`, [userId]);
    }
    async revokeUserSessions(userId) {
        await pool.execute(`UPDATE auth_sessions
       SET status = 'revoked', ended_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = 'active'`, [userId]);
    }
    async getRoleDefaultPermissionIds(roleId) {
        const [rows] = await pool.execute(`SELECT permission_id
       FROM auth_role_permission_defaults
       WHERE role_id = ? AND is_allowed = TRUE`, [roleId]);
        return rows.map((row) => row.permission_id);
    }
    async getUserPermissionIds(userId) {
        const [rows] = await pool.execute(`SELECT permission_id
       FROM auth_user_permissions
       WHERE user_id = ? AND is_allowed = TRUE`, [userId]);
        return rows.map((row) => row.permission_id);
    }
    async replaceUserPermissions(userId, permissionIds) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM auth_user_permissions WHERE user_id = ?', [userId]);
            for (const permissionId of permissionIds) {
                await connection.execute(`INSERT INTO auth_user_permissions (user_id, permission_id, is_allowed)
           VALUES (?, ?, TRUE)`, [userId, permissionId]);
            }
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    async applyRoleDefaultPermissions(userId, roleId) {
        const permissionIds = await this.getRoleDefaultPermissionIds(roleId);
        await this.replaceUserPermissions(userId, permissionIds);
        return permissionIds;
    }
    async permissions() {
        const [rows] = await pool.query('SELECT id, code, module, name_ru FROM auth_permissions ORDER BY module, code');
        return rows;
    }
    settings() {
        return {
            appName: 'Rafef Tech',
            authMode: 'session',
            mockAuthAvailable: true,
            paymentSettings: ['/finance/accounts', '/finance/payment-methods'],
        };
    }
}
