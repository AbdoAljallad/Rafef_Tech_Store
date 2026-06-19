import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';

export type EntityTranslationRow = RowDataPacket & {
  id: number;
  entity_type: string;
  entity_id: number;
  field_name: string;
  lang_code: string;
  text_value: string;
  source_lang_code: string | null;
  is_source: number;
  translation_origin: 'manual' | 'auto' | 'fallback_copy';
  confidence: string | null;
  created_at: Date;
  updated_at: Date;
};

export type UpsertTranslationInput = {
  entityType: string;
  entityId: number;
  fieldName: string;
  langCode: string;
  textValue: string;
  sourceLangCode?: string | null;
  isSource: boolean;
  translationOrigin: 'manual' | 'auto' | 'fallback_copy';
  confidence?: number | null;
};

export class EntityTranslationRepository {
  async upsert(input: UpsertTranslationInput) {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO entity_translations (
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
         updated_at = CURRENT_TIMESTAMP`,
      [
        input.entityType,
        input.entityId,
        input.fieldName,
        input.langCode,
        input.textValue,
        input.sourceLangCode ?? null,
        input.isSource,
        input.translationOrigin,
        input.confidence ?? null,
      ],
    );
  }

  async listByEntityField(entityType: string, entityId: number, fieldName: string) {
    const [rows] = await pool.execute<EntityTranslationRow[]>(
      `SELECT *
       FROM entity_translations
       WHERE entity_type = ? AND entity_id = ? AND field_name = ?
       ORDER BY is_source DESC, lang_code ASC`,
      [entityType, entityId, fieldName],
    );

    return rows;
  }
}
