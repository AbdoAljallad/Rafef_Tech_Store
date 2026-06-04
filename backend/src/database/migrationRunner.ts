import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env.js';
import { createServerConnection, pool } from './mysql.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationsDir = path.resolve(currentDir, '../../database/migrations');

export async function ensureDatabase() {
  const connection = await createServerConnection();

  try {
    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.MYSQL_DATABASE}\`
         CHARACTER SET utf8mb4
         COLLATE utf8mb4_0900_ai_ci`,
      );
    } catch (error) {
      const mysqlError = error as { code?: string };
      if (mysqlError.code !== 'ER_DBACCESS_DENIED_ERROR') {
        throw error;
      }
      console.warn(`Skipping database creation; user has no CREATE privilege. Using existing ${env.MYSQL_DATABASE}.`);
    }
  } finally {
    await connection.end();
  }
}

async function ensureMigrationTable(connection: PoolConnection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}

async function getAppliedMigrations(connection: PoolConnection) {
  const [rows] = await connection.query<Array<RowDataPacket & { version: string }>>(
    'SELECT version FROM schema_migrations',
  );
  return new Set(rows.map((row) => row.version));
}

export async function runMigrations() {
  await ensureDatabase();

  const connection = await pool.getConnection();

  try {
    await ensureMigrationTable(connection);
    const applied = await getAppliedMigrations(connection);
    const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying migration ${file}`);
      await connection.beginTransaction();

      try {
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    connection.release();
  }
}
