import { pool } from '../../database/mysql.js';
export class AuditService {
    async log(params) {
        await pool.execute(`INSERT INTO auth_audit_log (
         actor_user_id, action_code, module, entity_type, entity_id,
         old_values_json, new_values_json, ip_address
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            params.actorUserId ?? null,
            params.actionCode,
            params.module,
            params.entityType ?? null,
            params.entityId ?? null,
            params.oldValues === undefined ? null : JSON.stringify(params.oldValues),
            params.newValues === undefined ? null : JSON.stringify(params.newValues),
            params.ipAddress ?? null,
        ]);
    }
}
