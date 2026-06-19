import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../src/database/mysql.js';
import { EntityTranslationService } from '../src/shared/localization/entityTranslation.service.js';

type TranslationBackfillConfig = {
  tableName: string;
  entityType: string;
  fieldName: string;
  columnName: string;
};

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

async function main() {
  const translationService = new EntityTranslationService();

  await pool.query('DELETE FROM `entity_translations`');

  for (const config of translationBackfillConfigs) {
    const [rows] = await pool.query<Array<RowDataPacket & { id: number; text_value: string }>>(
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

  console.log('Entity translations refreshed successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
