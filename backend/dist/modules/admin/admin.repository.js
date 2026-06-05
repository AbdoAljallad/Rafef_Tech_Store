import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
export class AdminRepository {
    async users() {
        const [rows] = await pool.query(`SELECT u.id, u.username, u.display_name, u.status, u.max_discount_percent, u.last_login_at, r.code role_code, r.name_ru role_name
       FROM auth_users u INNER JOIN auth_roles r ON r.id = u.role_id
       ORDER BY u.id`);
        return rows;
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
