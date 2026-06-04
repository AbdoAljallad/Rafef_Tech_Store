-- Creative foundation: job types, jobs, lines, vendors, vendor tasks, status history
CREATE TABLE IF NOT EXISTS creative_job_types (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  default_name VARCHAR(255) NOT NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creative_vendors (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact JSON NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creative_jobs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  job_code VARCHAR(64) NOT NULL UNIQUE,
  job_type_id BIGINT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'draft',
  deadline_at TIMESTAMP NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creative_job_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  job_id BIGINT NOT NULL,
  line_type VARCHAR(128) NULL,
  description TEXT NULL,
  quantity DECIMAL(14,4) DEFAULT 1,
  unit_price DECIMAL(14,4) NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creative_vendor_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vendor_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  external_task_code VARCHAR(128) NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creative_job_status_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  job_id BIGINT NOT NULL,
  from_status VARCHAR(64) NULL,
  to_status VARCHAR(64) NOT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- basic indexes
ALTER TABLE creative_jobs ADD INDEX (job_type_id);
ALTER TABLE creative_job_lines ADD INDEX (job_id);
ALTER TABLE creative_vendor_tasks ADD INDEX (vendor_id);
ALTER TABLE creative_vendor_tasks ADD INDEX (job_id);
ALTER TABLE creative_job_status_history ADD INDEX (job_id);
