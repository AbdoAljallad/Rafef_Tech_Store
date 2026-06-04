-- Finance foundation: accounts, methods, transactions, ledger, expenses, refunds, work sessions, daily closings
CREATE TABLE IF NOT EXISTS finance_payment_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  metadata JSON NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_payment_methods (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NULL,
  config JSON NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  transaction_code VARCHAR(64) NOT NULL UNIQUE,
  account_id BIGINT NULL,
  payment_method_id BIGINT NULL,
  amount DECIMAL(14,4) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  direction ENUM('in','out') NOT NULL,
  reference_type VARCHAR(64) NULL,
  reference_id BIGINT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_customer_ledger (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  transaction_id BIGINT NULL,
  amount_change DECIMAL(14,4) NOT NULL,
  balance_after DECIMAL(14,4) NOT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_expenses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  expense_code VARCHAR(64) NOT NULL UNIQUE,
  account_id BIGINT NULL,
  amount DECIMAL(14,4) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  category VARCHAR(128) NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_refunds (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  refund_code VARCHAR(64) NOT NULL UNIQUE,
  transaction_id BIGINT NULL,
  amount DECIMAL(14,4) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  reason TEXT NULL,
  processed_by_user_id BIGINT NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_work_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  starting_balance DECIMAL(14,4) NULL,
  ending_balance DECIMAL(14,4) NULL,
  notes TEXT NULL
);

CREATE TABLE IF NOT EXISTS finance_daily_closings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  closed_at DATE NOT NULL UNIQUE,
  closed_by_user_id BIGINT NULL,
  totals JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- basic indexes
ALTER TABLE finance_transactions ADD INDEX (account_id);
ALTER TABLE finance_transactions ADD INDEX (payment_method_id);
ALTER TABLE finance_customer_ledger ADD INDEX (customer_id);
ALTER TABLE finance_expenses ADD INDEX (account_id);
