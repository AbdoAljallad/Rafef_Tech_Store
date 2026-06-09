import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  status: 'active' | 'disabled' | 'locked';
  max_discount_percent: string | null;
  last_login_at: Date | null;
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

type ActivityRow = RowDataPacket & {
  id: number;
  action_code: string;
  module: string;
  entity_type: string | null;
  entity_id: number | null;
  ip_address: string | null;
  created_at: Date;
};

export class AuthRepository {
  async findUserByUsername(username: string) {
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT u.id, u.username, u.password_hash, u.display_name, u.avatar_url, u.status,
              u.max_discount_percent, u.last_login_at, r.id AS role_id, r.code AS role_code, r.name_ru AS role_name_ru
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
              u.max_discount_percent, u.last_login_at, r.id AS role_id, r.code AS role_code, r.name_ru AS role_name_ru
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

  async updateOwnProfile(
    userId: number,
    input: {
      username: string;
      displayName: string;
      avatarUrl?: string | null;
      passwordHash?: string | null;
    },
  ) {
    try {
      if (input.passwordHash) {
        await pool.execute(
          `UPDATE auth_users
           SET username = ?, display_name = ?, avatar_url = ?, password_hash = ?
           WHERE id = ?`,
          [input.username, input.displayName, input.avatarUrl ?? null, input.passwordHash, userId],
        );
        return;
      }

      await pool.execute(
        `UPDATE auth_users
         SET username = ?, display_name = ?, avatar_url = ?
         WHERE id = ?`,
        [input.username, input.displayName, input.avatarUrl ?? null, userId],
      );
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Username already exists');
      }

      throw error;
    }
  }

  async getRecentActivity(userId: number, limit = 20) {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.trunc(limit))) : 20;

    const [rows] = await pool.execute<ActivityRow[]>(
      `SELECT id, action_code, module, entity_type, entity_id, ip_address, created_at
       FROM auth_audit_log
       WHERE actor_user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${safeLimit}`,
      [userId],
    );

    return rows;
  }
}
