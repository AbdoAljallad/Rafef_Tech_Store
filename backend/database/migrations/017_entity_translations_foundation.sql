CREATE TABLE entity_translations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  text_value TEXT NOT NULL,
  source_lang_code VARCHAR(10) NULL,
  is_source BOOLEAN NOT NULL DEFAULT FALSE,
  translation_origin ENUM('manual', 'auto', 'fallback_copy') NOT NULL DEFAULT 'manual',
  confidence DECIMAL(5,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_entity_translations_scope_lang (entity_type, entity_id, field_name, lang_code),
  KEY idx_entity_translations_lookup (entity_type, entity_id, field_name),
  KEY idx_entity_translations_lang (lang_code),
  KEY idx_entity_translations_source (source_lang_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
