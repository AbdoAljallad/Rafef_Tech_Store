import { pool } from '../../database/mysql.js';
export class EventService {
    async create(params) {
        await pool.execute(`INSERT INTO app_events (
         module, event_type, title, message, entity_type, entity_id, severity, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            params.module,
            params.eventType,
            params.title,
            params.message ?? null,
            params.entityType ?? null,
            params.entityId ?? null,
            params.severity ?? 'info',
            params.actorUserId ?? null,
        ]);
    }
}
