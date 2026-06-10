ALTER TABLE sales_invoices
  ADD COLUMN document_type ENUM('invoice', 'quote') NOT NULL DEFAULT 'invoice' AFTER is_walk_in,
  ADD COLUMN note_text TEXT NULL AFTER total,
  ADD COLUMN a4_header_text TEXT NULL AFTER note_text,
  ADD COLUMN a4_footer_text TEXT NULL AFTER a4_header_text,
  ADD COLUMN receipt_header_text TEXT NULL AFTER a4_footer_text,
  ADD COLUMN receipt_footer_text TEXT NULL AFTER receipt_header_text;

ALTER TABLE sales_invoices
  ADD KEY idx_sales_invoices_document_status (document_type, status, created_at);
