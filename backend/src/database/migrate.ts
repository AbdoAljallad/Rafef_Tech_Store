import { pool } from './mysql.js';
import { runMigrations } from './migrationRunner.js';

try {
  await runMigrations();
  console.log('Migrations completed');
} finally {
  await pool.end();
}
