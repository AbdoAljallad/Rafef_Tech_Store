import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  status: 'active' | 'disabled' | 'locked';
  max_discount_percent: string | null;
  role_id: number;
  role_code: string;
  role_name_ru: string;
};

type SessionRow = RowDataPacket & {
  id: number;
  user_id: number;
  status: 'active' | 'ended' | 'expired' | 'revoked';
  expires_at: Date;
};

export class AuthRepository {
  async findUserByUsername(username: string) {
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT u.id, u.username, u.password_hash, u.display_name, u.avatar_url, u.status,
              u.max_discount_percent, r.id AS role_id, r.code AS role_code, r.name_ru AS role_name_ru
       FROM auth_users u
       INNER JOIN auth_roles r ON r.id = u.role_id
       WHERE u.username = ?
       LIMIT 1`,
      [username],
    );

    return rows[0] ?? null;
  }

  async findUserById(userId: number) {
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT u.id, u.username, u.password_hash, u.display_name, u.avatar_url, u.status,
              u.max_discount_percent, r.id AS role_id, r.code AS role_code, r.name_ru AS role_name_ru
       FROM auth_users u
       INNER JOIN auth_roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1`,
      [userId],
    );

    return rows[0] ?? null;
  }

  async getUserPermissions(userId: number) {
    const [rows] = await pool.execute<Array<RowDataPacket & { code: string }>>(
      `SELECT p.code
       FROM auth_user_permissions up
       INNER JOIN auth_permissions p ON p.id = up.permission_id
       WHERE up.user_id = ? AND up.is_allowed = TRUE
       ORDER BY p.code`,
      [userId],
    );

    return rows.map((row) => row.code);
  }

  async createSession(params: {
    userId: number;
    sessionTokenHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO auth_sessions (user_id, session_token_hash, expires_at, ip_address, user_agent, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [params.userId, params.sessionTokenHash, params.expiresAt, params.ipAddress ?? null, params.userAgent ?? null],
    );

    return result.insertId;
  }

  async findActiveSessionByTokenHash(sessionTokenHash: string) {
    const [rows] = await pool.execute<SessionRow[]>(
      `SELECT id, user_id, status, expires_at
       FROM auth_sessions
       WHERE session_token_hash = ? AND status = 'active'
       LIMIT 1`,
      [sessionTokenHash],
    );

    return rows[0] ?? null;
  }

  async endSession(sessionId: number) {
    await pool.execute(
      `UPDATE auth_sessions
       SET status = 'ended', ended_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`,
      [sessionId],
    );
  }

  async expireSession(sessionId: number) {
    await pool.execute(
      `UPDATE auth_sessions
       SET status = 'expired', ended_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`,
      [sessionId],
    );
  }

  async updateLastLogin(userId: number) {
    await pool.execute('UPDATE auth_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
  }
}
