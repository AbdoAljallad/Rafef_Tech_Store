import { pool } from '../../database/mysql.js';
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
