CREATE TABLE crm_customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_code VARCHAR(40) NOT NULL,
  name VARCHAR(200) NOT NULL,
  phone_primary VARCHAR(40) NULL,
  phone_secondary VARCHAR(40) NULL,
  email VARCHAR(160) NULL,
  customer_type ENUM('person', 'business') NOT NULL DEFAULT 'person',
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT UNSIGNED NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_customers_code (customer_code),
  KEY idx_crm_customers_phone_primary (phone_primary),
  KEY idx_crm_customers_name (name),
  KEY idx_crm_customers_active (is_active),
  CONSTRAINT fk_crm_customers_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_crm_customers_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crm_customer_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  contact_type ENUM('phone', 'email', 'whatsapp', 'telegram', 'other') NOT NULL,
  contact_value VARCHAR(200) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_crm_customer_contacts_customer (customer_id),
  KEY idx_crm_customer_contacts_value (contact_type, contact_value),
  CONSTRAINT fk_crm_customer_contacts_customer FOREIGN KEY (customer_id) REFERENCES crm_customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crm_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  location_type ENUM('home', 'school', 'company', 'store', 'factory', 'hospital', 'other') NOT NULL DEFAULT 'other',
  address_text TEXT NULL,
  map_url VARCHAR(500) NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_crm_locations_customer (customer_id),
  KEY idx_crm_locations_type (location_type),
  CONSTRAINT fk_crm_locations_customer FOREIGN KEY (customer_id) REFERENCES crm_customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crm_customer_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  note_text TEXT NOT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_crm_customer_notes_customer_created (customer_id, created_at),
  CONSTRAINT fk_crm_customer_notes_customer FOREIGN KEY (customer_id) REFERENCES crm_customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_crm_customer_notes_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  name_ru VARCHAR(120) NOT NULL,
  allows_fraction BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_units_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NULL,
  code VARCHAR(80) NOT NULL,
  default_name VARCHAR(180) NOT NULL,
  show_in_sales BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_repair BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_projects BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_creative BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_categories_code (code),
  KEY idx_catalog_categories_parent (parent_id),
  KEY idx_catalog_categories_active (is_active),
  CONSTRAINT fk_catalog_categories_parent FOREIGN KEY (parent_id) REFERENCES catalog_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_category_translations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_category_translations_lang (category_id, lang_code),
  CONSTRAINT fk_catalog_category_translations_category FOREIGN KEY (category_id) REFERENCES catalog_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(80) NOT NULL,
  default_name VARCHAR(220) NOT NULL,
  tracking_type ENUM('quantity', 'serial', 'batch') NOT NULL DEFAULT 'quantity',
  current_purchase_price DECIMAL(19,4) NOT NULL DEFAULT 0,
  current_sale_price DECIMAL(19,4) NOT NULL DEFAULT 0,
  reorder_threshold DECIMAL(19,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT UNSIGNED NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_products_sku (sku),
  KEY idx_catalog_products_category (category_id),
  KEY idx_catalog_products_unit (unit_id),
  KEY idx_catalog_products_active (is_active),
  CONSTRAINT fk_catalog_products_category FOREIGN KEY (category_id) REFERENCES catalog_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_products_unit FOREIGN KEY (unit_id) REFERENCES catalog_units (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_products_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_catalog_products_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_catalog_products_prices CHECK (
    current_purchase_price >= 0 AND current_sale_price >= 0 AND reorder_threshold >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_product_translations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  name VARCHAR(220) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_product_translations_lang (product_id, lang_code),
  KEY idx_catalog_product_translations_name (name),
  CONSTRAINT fk_catalog_product_translations_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_product_barcodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  barcode VARCHAR(120) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_product_barcodes_barcode (barcode),
  KEY idx_catalog_product_barcodes_product (product_id),
  CONSTRAINT fk_catalog_product_barcodes_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_product_serials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  serial_no VARCHAR(160) NOT NULL,
  status ENUM('in_stock', 'reserved', 'sold', 'installed', 'returned', 'damaged', 'lost') NOT NULL DEFAULT 'in_stock',
  current_source_type VARCHAR(80) NULL,
  current_source_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_product_serials_product_serial (product_id, serial_no),
  KEY idx_catalog_product_serials_status (status),
  CONSTRAINT fk_catalog_product_serials_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(160) NULL,
  address_text TEXT NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_catalog_suppliers_name (name),
  KEY idx_catalog_suppliers_phone (phone),
  CONSTRAINT fk_catalog_suppliers_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_product_suppliers (
  product_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  supplier_sku VARCHAR(120) NULL,
  last_purchase_price DECIMAL(19,4) NULL,
  PRIMARY KEY (product_id, supplier_id),
  CONSTRAINT fk_catalog_product_suppliers_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_product_suppliers_supplier FOREIGN KEY (supplier_id) REFERENCES catalog_suppliers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_catalog_product_suppliers_price CHECK (last_purchase_price IS NULL OR last_purchase_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_product_price_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  old_purchase_price DECIMAL(19,4) NOT NULL DEFAULT 0,
  new_purchase_price DECIMAL(19,4) NOT NULL DEFAULT 0,
  old_sale_price DECIMAL(19,4) NOT NULL DEFAULT 0,
  new_sale_price DECIMAL(19,4) NOT NULL DEFAULT 0,
  reason VARCHAR(255) NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_catalog_product_price_history_product_changed (product_id, changed_at),
  CONSTRAINT fk_catalog_product_price_history_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_product_price_history_changed_by FOREIGN KEY (changed_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_catalog_product_price_history_prices CHECK (
    old_purchase_price >= 0 AND new_purchase_price >= 0 AND old_sale_price >= 0 AND new_sale_price >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_service_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  default_name VARCHAR(180) NOT NULL,
  module VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_service_categories_code (code),
  KEY idx_catalog_service_categories_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_category_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(100) NOT NULL,
  default_name VARCHAR(220) NOT NULL,
  module VARCHAR(64) NOT NULL,
  default_price DECIMAL(19,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_services_code (code),
  KEY idx_catalog_services_module_active (module, is_active),
  CONSTRAINT fk_catalog_services_category FOREIGN KEY (service_category_id) REFERENCES catalog_service_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_catalog_services_default_price CHECK (default_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_service_translations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id BIGINT UNSIGNED NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  name VARCHAR(220) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_service_translations_lang (service_id, lang_code),
  CONSTRAINT fk_catalog_service_translations_service FOREIGN KEY (service_id) REFERENCES catalog_services (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
