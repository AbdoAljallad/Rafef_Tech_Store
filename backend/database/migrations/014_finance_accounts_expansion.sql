UPDATE finance_payment_accounts
SET type = 'cash_drawer'
WHERE type IS NULL OR type = '';

ALTER TABLE finance_payment_accounts
  MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'cash_drawer',
  ADD COLUMN provider VARCHAR(120) NULL AFTER type,
  ADD COLUMN currency VARCHAR(8) NOT NULL DEFAULT 'EGP' AFTER provider,
  ADD COLUMN account_number VARCHAR(120) NULL AFTER currency,
  ADD COLUMN opening_balance DECIMAL(14,4) NOT NULL DEFAULT 0 AFTER account_number,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER opening_balance,
  ADD COLUMN notes TEXT NULL AFTER metadata;

ALTER TABLE finance_payment_methods
  ADD COLUMN method_type VARCHAR(64) NOT NULL DEFAULT 'cash' AFTER name,
  ADD COLUMN linked_account_id BIGINT NULL AFTER provider,
  ADD COLUMN notes TEXT NULL AFTER config,
  ADD KEY idx_finance_payment_methods_linked_account (linked_account_id),
  ADD CONSTRAINT fk_finance_payment_methods_linked_account
    FOREIGN KEY (linked_account_id) REFERENCES finance_payment_accounts (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE finance_transactions
  MODIFY COLUMN currency VARCHAR(8) NOT NULL DEFAULT 'EGP',
  ADD COLUMN operation_type VARCHAR(64) NOT NULL DEFAULT 'general' AFTER direction,
  ADD COLUMN counterparty_name VARCHAR(180) NULL AFTER reference_id,
  ADD COLUMN external_reference VARCHAR(120) NULL AFTER counterparty_name,
  ADD KEY idx_finance_transactions_operation_type (operation_type);

ALTER TABLE finance_expenses
  MODIFY COLUMN currency VARCHAR(8) NOT NULL DEFAULT 'EGP';

ALTER TABLE finance_refunds
  MODIFY COLUMN currency VARCHAR(8) NOT NULL DEFAULT 'EGP';
