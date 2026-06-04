CREATE TABLE app_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module VARCHAR(64) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NULL,
  entity_type VARCHAR(120) NULL,
  entity_id BIGINT UNSIGNED NULL,
  severity ENUM('info','important','urgent','critical') NOT NULL DEFAULT 'info',
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_app_events_module_created (module, created_at),
  KEY idx_app_events_entity (entity_type, entity_id),
  CONSTRAINT fk_app_events_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_device_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name_ru VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_device_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_device_brands (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_device_brands_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_device_models (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  brand_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_device_models_brand_name (brand_id, name),
  KEY idx_repair_device_models_category (category_id),
  CONSTRAINT fk_repair_device_models_category FOREIGN KEY (category_id) REFERENCES repair_device_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_device_models_brand FOREIGN KEY (brand_id) REFERENCES repair_device_brands (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_devices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  brand_id BIGINT UNSIGNED NULL,
  model_id BIGINT UNSIGNED NULL,
  device_name VARCHAR(220) NOT NULL,
  serial_no VARCHAR(160) NULL,
  imei VARCHAR(80) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_devices_customer (customer_id),
  CONSTRAINT fk_repair_devices_customer FOREIGN KEY (customer_id) REFERENCES crm_customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_devices_category FOREIGN KEY (category_id) REFERENCES repair_device_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_devices_brand FOREIGN KEY (brand_id) REFERENCES repair_device_brands (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_repair_devices_model FOREIGN KEY (model_id) REFERENCES repair_device_models (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_code VARCHAR(40) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  device_id BIGINT UNSIGNED NOT NULL,
  status ENUM('new','inspection','waiting_customer_approval','waiting_part','in_repair','ready_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'new',
  problem_description TEXT NOT NULL,
  intake_notes TEXT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_orders_code (order_code),
  KEY idx_repair_orders_customer (customer_id),
  KEY idx_repair_orders_device (device_id),
  KEY idx_repair_orders_status (status),
  CONSTRAINT fk_repair_orders_customer FOREIGN KEY (customer_id) REFERENCES crm_customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_orders_device FOREIGN KEY (device_id) REFERENCES repair_devices (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_repair_orders_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_order_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NULL,
  service_name_snapshot VARCHAR(220) NOT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  unit_price_snapshot DECIMAL(19,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_order_services_order (repair_order_id),
  CONSTRAINT fk_repair_order_services_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_order_services_service FOREIGN KEY (service_id) REFERENCES catalog_services (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_repair_order_services_quantity CHECK (quantity > 0 AND unit_price_snapshot >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_order_parts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name_snapshot VARCHAR(220) NOT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  unit_cost_snapshot DECIMAL(19,4) NOT NULL DEFAULT 0,
  reservation_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_order_parts_order (repair_order_id),
  CONSTRAINT fk_repair_order_parts_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_order_parts_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_order_parts_reservation FOREIGN KEY (reservation_id) REFERENCES inventory_stock_reservations (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_repair_order_parts_quantity CHECK (quantity > 0 AND unit_cost_snapshot >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_order_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(80) NULL,
  new_status VARCHAR(80) NOT NULL,
  note VARCHAR(255) NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_order_status_history_order (repair_order_id, changed_at),
  CONSTRAINT fk_repair_status_history_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE repair_order_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  note_text TEXT NOT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_order_notes_order (repair_order_id, created_at),
  CONSTRAINT fk_repair_order_notes_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_repair_order_notes_user FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
