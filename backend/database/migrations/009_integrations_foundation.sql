CREATE TABLE IF NOT EXISTS integration_webhook_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  target VARCHAR(80) NOT NULL,
  webhook_url VARCHAR(500) NULL,
  event_type VARCHAR(120) NOT NULL,
  payload_json JSON NOT NULL,
  status ENUM('pending','processing','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  next_attempt_at TIMESTAMP NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_integration_webhook_outbox_status_created (status, created_at),
  KEY idx_integration_webhook_outbox_target (target),
  CONSTRAINT fk_integration_webhook_outbox_user FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
