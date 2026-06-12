ALTER TABLE creative_jobs
  ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER job_type_id,
  ADD KEY idx_creative_jobs_customer (customer_id),
  ADD CONSTRAINT fk_creative_jobs_customer
    FOREIGN KEY (customer_id) REFERENCES crm_customers (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE sales_invoices
  ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER repair_order_id,
  ADD KEY idx_sales_invoices_project (project_id),
  ADD CONSTRAINT fk_sales_invoices_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE project_materials
  ADD COLUMN sales_invoice_id BIGINT NULL AFTER created_at,
  ADD COLUMN billed_at TIMESTAMP NULL AFTER sales_invoice_id,
  ADD KEY idx_project_materials_sales_invoice (sales_invoice_id),
  ADD CONSTRAINT fk_project_materials_sales_invoice
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE sales_invoice_lines
  MODIFY COLUMN line_type ENUM('product', 'repair_part', 'repair_service', 'manual', 'project_material') NOT NULL DEFAULT 'product',
  ADD COLUMN project_material_id BIGINT UNSIGNED NULL AFTER repair_order_part_id,
  ADD KEY idx_sales_invoice_lines_project_material (project_material_id),
  ADD CONSTRAINT fk_sales_invoice_lines_project_material
    FOREIGN KEY (project_material_id) REFERENCES project_materials (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
