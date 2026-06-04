CREATE TABLE project_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  default_name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_types_code (code),
  CONSTRAINT fk_project_types_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_code VARCHAR(40) NOT NULL,
  project_type_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NULL,
  status ENUM('draft','planned','in_progress','on_hold','completed','cancelled') NOT NULL DEFAULT 'draft',
  planned_start_at TIMESTAMP NULL,
  planned_end_at TIMESTAMP NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_projects_code (project_code),
  KEY idx_projects_type (project_type_id),
  KEY idx_projects_customer (customer_id),
  KEY idx_projects_status_created (status, created_at),
  CONSTRAINT fk_projects_type FOREIGN KEY (project_type_id) REFERENCES project_types (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES crm_customers (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_projects_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE project_sites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  site_name VARCHAR(220) NOT NULL,
  address_text TEXT NULL,
  location_notes TEXT NULL,
  contact_name VARCHAR(180) NULL,
  contact_phone VARCHAR(80) NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_sites_project (project_id),
  CONSTRAINT fk_project_sites_project FOREIGN KEY (project_id) REFERENCES projects (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_sites_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE project_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(80) NULL,
  to_status VARCHAR(80) NOT NULL,
  stage_code VARCHAR(80) NULL,
  notes TEXT NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_status_history_project (project_id, changed_at),
  CONSTRAINT fk_project_status_history_project FOREIGN KEY (project_id) REFERENCES projects (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE project_materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name_snapshot VARCHAR(220) NOT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  unit_cost_snapshot DECIMAL(19,4) NOT NULL DEFAULT 0,
  reservation_id BIGINT UNSIGNED NOT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_materials_project (project_id),
  KEY idx_project_materials_product (product_id),
  CONSTRAINT fk_project_materials_project FOREIGN KEY (project_id) REFERENCES projects (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_materials_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_materials_reservation FOREIGN KEY (reservation_id) REFERENCES inventory_stock_reservations (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_materials_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_project_materials_quantity CHECK (quantity > 0 AND unit_cost_snapshot >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE project_installed_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  asset_type VARCHAR(120) NOT NULL,
  asset_name VARCHAR(220) NOT NULL,
  serial_no VARCHAR(160) NULL,
  ip_address VARCHAR(80) NULL,
  mac_address VARCHAR(80) NULL,
  installation_notes TEXT NULL,
  installed_at TIMESTAMP NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_installed_assets_project (project_id),
  KEY idx_project_installed_assets_site (site_id),
  CONSTRAINT fk_project_assets_project FOREIGN KEY (project_id) REFERENCES projects (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_assets_site FOREIGN KEY (site_id) REFERENCES project_sites (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_project_assets_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_project_assets_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE project_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  note_text TEXT NOT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_notes_project (project_id, created_at),
  CONSTRAINT fk_project_notes_project FOREIGN KEY (project_id) REFERENCES projects (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_notes_user FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
