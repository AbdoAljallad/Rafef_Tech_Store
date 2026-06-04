CREATE TABLE inventory_stock_balances (
  product_id BIGINT UNSIGNED NOT NULL,
  quantity_on_hand DECIMAL(19,4) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(19,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  CONSTRAINT fk_inventory_stock_balances_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_inventory_stock_balances_quantities CHECK (
    quantity_on_hand >= 0 AND quantity_reserved >= 0 AND quantity_reserved <= quantity_on_hand
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('purchase_in', 'adjustment_in', 'adjustment_out', 'reservation_consume') NOT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  unit_cost DECIMAL(19,4) NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  note VARCHAR(255) NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inventory_stock_movements_product_created (product_id, created_at),
  KEY idx_inventory_stock_movements_source (source_type, source_id),
  CONSTRAINT fk_inventory_stock_movements_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_stock_movements_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_inventory_stock_movements_quantity CHECK (quantity > 0),
  CONSTRAINT chk_inventory_stock_movements_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_stock_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  status ENUM('active', 'consumed', 'released', 'cancelled') NOT NULL DEFAULT 'active',
  source_type VARCHAR(80) NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(255) NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  consumed_by_user_id BIGINT UNSIGNED NULL,
  released_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at TIMESTAMP NULL,
  released_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_inventory_stock_reservations_product_status (product_id, status),
  KEY idx_inventory_stock_reservations_source (source_type, source_id),
  CONSTRAINT fk_inventory_stock_reservations_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_stock_reservations_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_inventory_stock_reservations_consumed_by FOREIGN KEY (consumed_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_inventory_stock_reservations_released_by FOREIGN KEY (released_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_inventory_stock_reservations_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_purchase_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id BIGINT UNSIGNED NULL,
  status ENUM('draft', 'received') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  received_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_inventory_purchase_orders_supplier (supplier_id),
  KEY idx_inventory_purchase_orders_status_created (status, created_at),
  CONSTRAINT fk_inventory_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES catalog_suppliers (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_inventory_purchase_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_inventory_purchase_orders_received_by FOREIGN KEY (received_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_purchase_order_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  unit_cost DECIMAL(19,4) NOT NULL,
  received_quantity DECIMAL(19,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_inventory_purchase_order_lines_order (purchase_order_id),
  KEY idx_inventory_purchase_order_lines_product (product_id),
  CONSTRAINT fk_inventory_purchase_order_lines_order FOREIGN KEY (purchase_order_id) REFERENCES inventory_purchase_orders (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_purchase_order_lines_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_inventory_purchase_order_lines_quantities CHECK (
    quantity > 0 AND unit_cost >= 0 AND received_quantity >= 0 AND received_quantity <= quantity
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reason VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inventory_adjustments_created (created_at),
  CONSTRAINT fk_inventory_adjustments_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_adjustment_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  adjustment_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('in', 'out') NOT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  unit_cost DECIMAL(19,4) NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_inventory_adjustment_lines_adjustment (adjustment_id),
  KEY idx_inventory_adjustment_lines_product (product_id),
  CONSTRAINT fk_inventory_adjustment_lines_adjustment FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_adjustment_lines_product FOREIGN KEY (product_id) REFERENCES catalog_products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_inventory_adjustment_lines_quantity CHECK (quantity > 0),
  CONSTRAINT chk_inventory_adjustment_lines_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
