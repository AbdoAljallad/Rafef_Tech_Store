-- Sales / POS foundation
CREATE TABLE sales_invoices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_code VARCHAR(64) NOT NULL,
  customer_id BIGINT NULL,
  is_walk_in BOOLEAN DEFAULT FALSE,
  status ENUM('draft','approved','voided','returned') DEFAULT 'draft',
  subtotal DECIMAL(14,2) DEFAULT 0,
  tax DECIMAL(14,2) DEFAULT 0,
  total DECIMAL(14,2) DEFAULT 0,
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by_user_id BIGINT NULL,
  approved_at TIMESTAMP NULL,
  voided_by_user_id BIGINT NULL,
  voided_at TIMESTAMP NULL
);

CREATE TABLE sales_invoice_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity DECIMAL(14,2) NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  unit_cost DECIMAL(14,2) NULL,
  line_total DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_invoice_lines_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
);

CREATE TABLE sales_returns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  return_code VARCHAR(64) NOT NULL,
  invoice_id BIGINT NULL,
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_return_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  return_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity DECIMAL(14,2) NOT NULL,
  unit_price DECIMAL(14,2) NULL,
  unit_cost DECIMAL(14,2) NULL,
  line_total DECIMAL(14,2) NULL,
  CONSTRAINT fk_sales_return_lines_return FOREIGN KEY (return_id) REFERENCES sales_returns(id)
);

-- Indexes
ALTER TABLE sales_invoices ADD KEY idx_sales_invoices_code (invoice_code);
ALTER TABLE sales_invoice_lines ADD KEY idx_sales_invoice_lines_invoice (invoice_id);
