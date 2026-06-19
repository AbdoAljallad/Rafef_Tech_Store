import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../src/database/mysql.js';
import { EntityTranslationService } from '../src/shared/localization/entityTranslation.service.js';

type BackupPayload = Record<string, RowDataPacket[]>;

type TranslationBackfillConfig = {
  tableName: string;
  entityType: string;
  fieldName: string;
  columnName: string;
};

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backupDir = path.resolve(currentDir, '../tmp/rebuild-backups');

const translationBackfillConfigs: TranslationBackfillConfig[] = [
  { tableName: 'crm_customers', entityType: 'crm_customers', fieldName: 'name', columnName: 'name' },
  { tableName: 'catalog_categories', entityType: 'catalog_categories', fieldName: 'default_name', columnName: 'default_name' },
  { tableName: 'catalog_products', entityType: 'catalog_products', fieldName: 'default_name', columnName: 'default_name' },
  { tableName: 'catalog_services', entityType: 'catalog_services', fieldName: 'default_name', columnName: 'default_name' },
  { tableName: 'catalog_suppliers', entityType: 'catalog_suppliers', fieldName: 'name', columnName: 'name' },
  { tableName: 'project_types', entityType: 'project_types', fieldName: 'default_name', columnName: 'default_name' },
  { tableName: 'creative_job_types', entityType: 'creative_job_types', fieldName: 'default_name', columnName: 'default_name' },
  { tableName: 'creative_vendors', entityType: 'creative_vendors', fieldName: 'name', columnName: 'name' },
];

function quoteIdentifier(identifier: string) {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

function normalizeInsertValue(value: unknown) {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
}

async function listTables(connection: PoolConnection) {
  const [rows] = await connection.query<Array<RowDataPacket & { table_name: string }>>(
    `
      SELECT TABLE_NAME AS table_name
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME <> 'schema_migrations'
      ORDER BY TABLE_NAME ASC
    `,
  );

  return rows.map((row) => row.table_name);
}

async function exportTables(connection: PoolConnection, tables: string[]) {
  const payload: BackupPayload = {};

  for (const tableName of tables) {
    if (tableName === 'entity_translations') {
      continue;
    }

    const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${quoteIdentifier(tableName)}`);
    payload[tableName] = rows;
  }

  return payload;
}

async function writeBackup(payload: BackupPayload) {
  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `db-rebuild-backup-${timestamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), 'utf8');
  return backupPath;
}

async function clearTables(connection: PoolConnection, tables: string[]) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('DELETE FROM `entity_translations`');

  for (const tableName of tables) {
    if (tableName === 'entity_translations') {
      continue;
    }

    await connection.query(`DELETE FROM ${quoteIdentifier(tableName)}`);
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function restoreTableRows(connection: PoolConnection, tableName: string, rows: RowDataPacket[]) {
  if (!rows.length) {
    return;
  }

  const columns = Object.keys(rows[0] ?? {});
  if (!columns.length) {
    return;
  }

  const columnSql = columns.map(quoteIdentifier).join(', ');
  const chunkSize = 200;

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const placeholders = chunk
      .map(() => `(${columns.map(() => '?').join(', ')})`)
      .join(', ');
    const values = chunk.flatMap((row) => columns.map((column) => normalizeInsertValue(row[column])));

    await connection.query(
      `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES ${placeholders}`,
      values,
    );
  }
}

async function restoreTables(connection: PoolConnection, payload: BackupPayload) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const [tableName, rows] of Object.entries(payload)) {
    await restoreTableRows(connection, tableName, rows);
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function backfillTranslations(connection: PoolConnection) {
  const translationService = new EntityTranslationService();

  await connection.query('DELETE FROM `entity_translations`');

  for (const config of translationBackfillConfigs) {
    const [rows] = await connection.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id, ${quoteIdentifier(config.columnName)} AS text_value
        FROM ${quoteIdentifier(config.tableName)}
        WHERE ${quoteIdentifier(config.columnName)} IS NOT NULL
          AND TRIM(${quoteIdentifier(config.columnName)}) <> ''
        ORDER BY id ASC
      `,
    );

    for (const row of rows) {
      await translationService.syncEntityField({
        entityType: config.entityType,
        entityId: Number(row.id),
        fieldName: config.fieldName,
        text: String(row.text_value ?? ''),
      });
    }
  }
}

async function main() {
  const connection = await pool.getConnection();

  try {
    const tables = await listTables(connection);
    const payload = await exportTables(connection, tables);
    const backupPath = await writeBackup(payload);

    console.log(`Backup written to ${backupPath}`);
    console.log(`Rebuilding ${Object.keys(payload).length.toString()} tables...`);

    await connection.beginTransaction();

    try {
      await clearTables(connection, tables);
      await restoreTables(connection, payload);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    await backfillTranslations(connection);

    console.log('Database rows were deleted, restored, and translation backfill completed.');
  } finally {
    connection.release();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
