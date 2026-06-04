import { pool } from '../../database/mysql.js';
export class AuthRepository {
    async findUserByUsername(username) {
        const [rows] = await pool.execute(`SELECT u.id, u.username, u.password_hash, u.display_name, u.avatar_url, u.status,
              u.max_discount_percent, r.id AS role_id, r.code AS role_code, r.name_ru AS role_name_ru
       FROM auth_users u
       INNER JOIN auth_roles r ON r.id = u.role_id
       WHERE u.username = ?
       LIMIT 1`, [username]);
        return rows[0] ?? null;
    }
    async findUserById(userId) {
        const [rows] = await pool.execute(`SELECT u.id, u.username, u.password_hash, u.display_name, u.avatar_url, u.status,
              u.max_discount_percent, r.id AS role_id, r.code AS role_code, r.name_ru AS role_name_ru
       FROM auth_users u
       INNER JOIN auth_roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1`, [userId]);
        return rows[0] ?? null;
    }
    async getUserPermissions(userId) {
        const [rows] = await pool.execute(`SELECT p.code
       FROM auth_user_permissions up
       INNER JOIN auth_permissions p ON p.id = up.permission_id
       WHERE up.user_id = ? AND up.is_allowed = TRUE
       ORDER BY p.code`, [userId]);
        return rows.map((row) => row.code);
    }
    async createSession(params) {
        const [result] = await pool.execute(`INSERT INTO auth_sessions (user_id, session_token_hash, expires_at, ip_address, user_agent, status)
       VALUES (?, ?, ?, ?, ?, 'active')`, [params.userId, params.sessionTokenHash, params.expiresAt, params.ipAddress ?? null, params.userAgent ?? null]);
        return result.insertId;
    }
    async findActiveSessionByTokenHash(sessionTokenHash) {
        const [rows] = await pool.execute(`SELECT id, user_id, status, expires_at
       FROM auth_sessions
       WHERE session_token_hash = ? AND status = 'active'
       LIMIT 1`, [sessionTokenHash]);
        return rows[0] ?? null;
    }
    async endSession(sessionId) {
        await pool.execute(`UPDATE auth_sessions
       SET status = 'ended', ended_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`, [sessionId]);
    }
    async expireSession(sessionId) {
        await pool.execute(`UPDATE auth_sessions
       SET status = 'expired', ended_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`, [sessionId]);
    }
    async updateLastLogin(userId) {
        await pool.execute('UPDATE auth_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    }
}
