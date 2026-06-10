ALTER TABLE sales_invoices
  ADD COLUMN repair_order_id BIGINT UNSIGNED NULL AFTER customer_id,
  ADD KEY idx_sales_invoices_repair_order (repair_order_id),
  ADD CONSTRAINT fk_sales_invoices_repair_order
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE sales_invoice_lines
  MODIFY COLUMN product_id BIGINT NULL,
  ADD COLUMN line_type ENUM('product', 'repair_part', 'repair_service', 'manual') NOT NULL DEFAULT 'product' AFTER invoice_id,
  ADD COLUMN description_snapshot VARCHAR(220) NULL AFTER product_id,
  ADD COLUMN sku_snapshot VARCHAR(120) NULL AFTER description_snapshot,
  ADD COLUMN category_name_snapshot VARCHAR(180) NULL AFTER sku_snapshot,
  ADD COLUMN reservation_id BIGINT UNSIGNED NULL AFTER unit_cost,
  ADD COLUMN repair_order_service_id BIGINT UNSIGNED NULL AFTER reservation_id,
  ADD COLUMN repair_order_part_id BIGINT UNSIGNED NULL AFTER repair_order_service_id,
  ADD COLUMN source_type VARCHAR(64) NULL AFTER repair_order_part_id,
  ADD COLUMN source_id BIGINT UNSIGNED NULL AFTER source_type,
  ADD KEY idx_sales_invoice_lines_type (line_type),
  ADD KEY idx_sales_invoice_lines_reservation (reservation_id),
  ADD KEY idx_sales_invoice_lines_repair_service (repair_order_service_id),
  ADD KEY idx_sales_invoice_lines_repair_part (repair_order_part_id),
  ADD CONSTRAINT fk_sales_invoice_lines_reservation
    FOREIGN KEY (reservation_id) REFERENCES inventory_stock_reservations (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT fk_sales_invoice_lines_repair_service
    FOREIGN KEY (repair_order_service_id) REFERENCES repair_order_services (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT fk_sales_invoice_lines_repair_part
    FOREIGN KEY (repair_order_part_id) REFERENCES repair_order_parts (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE repair_order_services
  ADD COLUMN sales_invoice_id BIGINT NULL AFTER created_at,
  ADD COLUMN billed_at TIMESTAMP NULL AFTER sales_invoice_id,
  ADD KEY idx_repair_order_services_sales_invoice (sales_invoice_id),
  ADD CONSTRAINT fk_repair_order_services_sales_invoice
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE repair_order_parts
  ADD COLUMN sales_invoice_id BIGINT NULL AFTER created_at,
  ADD COLUMN billed_at TIMESTAMP NULL AFTER sales_invoice_id,
  ADD KEY idx_repair_order_parts_sales_invoice (sales_invoice_id),
  ADD CONSTRAINT fk_repair_order_parts_sales_invoice
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
