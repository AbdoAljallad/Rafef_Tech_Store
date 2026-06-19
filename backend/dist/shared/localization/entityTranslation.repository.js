import { pool } from '../../database/mysql.js';
export class EntityTranslationRepository {
    async upsert(input) {
        await pool.execute(`INSERT INTO entity_translations (
         entity_type,
         entity_id,
         field_name,
         lang_code,
         text_value,
         source_lang_code,
         is_source,
         translation_origin,
         confidence
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         text_value = VALUES(text_value),
         source_lang_code = VALUES(source_lang_code),
         is_source = VALUES(is_source),
         translation_origin = VALUES(translation_origin),
         confidence = VALUES(confidence),
         updated_at = CURRENT_TIMESTAMP`, [
            input.entityType,
            input.entityId,
            input.fieldName,
            input.langCode,
            input.textValue,
            input.sourceLangCode ?? null,
            input.isSource,
            input.translationOrigin,
            input.confidence ?? null,
        ]);
    }
    async listByEntityField(entityType, entityId, fieldName) {
        const [rows] = await pool.execute(`SELECT *
       FROM entity_translations
       WHERE entity_type = ? AND entity_id = ? AND field_name = ?
       ORDER BY is_source DESC, lang_code ASC`, [entityType, entityId, fieldName]);
        return rows;
    }
}
