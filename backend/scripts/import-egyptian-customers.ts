import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type CustomerRow = {
  Name: string;
  'Phones Local': string;
  'Phones International': string;
  Email: string;
  Organization: string;
  Labels: string;
  Notes: string;
  'Source Row': string;
};

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cur += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(filePath: string): CustomerRow[] {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim();
    });
    return row as CustomerRow;
  });
}

function cleanName(row: CustomerRow): string {
  const name = row.Name?.trim();
  if (name) return name;
  const phone = row['Phones Local']?.split(';')[0]?.trim();
  return phone ? `Customer ${phone}` : 'Unnamed Customer';
}

function normalizePhones(value: string): string[] {
  return Array.from(
    new Set(
      (value || '')
        .split(';')
        .map((p) => p.trim())
        .filter((p) => /^01\d{9}$/.test(p)),
    ),
  );
}

async function customerExistsByPhone(conn: mysql.Connection, phone: string): Promise<number | null> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT id FROM crm_customers WHERE phone_primary = ? OR phone_secondary = ? LIMIT 1`,
    [phone, phone],
  );
  if (rows[0]?.id) return Number(rows[0].id);

  const [contactRows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT customer_id AS id FROM crm_customer_contacts WHERE contact_type = 'phone' AND contact_value = ? LIMIT 1`,
    [phone],
  );
  return contactRows[0]?.id ? Number(contactRows[0].id) : null;
}

async function nextCustomerCode(conn: mysql.Connection): Promise<string> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) + 1 AS n FROM crm_customers`,
  );
  return `CUST-${String(Number(rows[0].n)).padStart(6, '0')}`;
}

async function ensureContact(conn: mysql.Connection, customerId: number, phone: string, isPrimary: boolean) {
  await conn.execute(
    `INSERT INTO crm_customer_contacts (customer_id, contact_type, contact_value, is_primary)
     SELECT ?, 'phone', ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM crm_customer_contacts
       WHERE customer_id = ? AND contact_type = 'phone' AND contact_value = ?
     )`,
    [customerId, phone, isPrimary ? 1 : 0, customerId, phone],
  );
}

async function main() {
  const csvPath = path.resolve(process.cwd(), process.argv[2] || '../egyptian_customers_grouped.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const conn = await mysql.createConnection({
    host: env('DB_HOST', env('MYSQL_HOST', '127.0.0.1')),
    port: Number(env('DB_PORT', env('MYSQL_PORT', '3306'))),
    user: env('DB_USER', env('MYSQL_USER', 'rafef_user')),
    password: env('DB_PASSWORD', env('MYSQL_PASSWORD', 'rafef_password')),
    database: env('DB_NAME', env('MYSQL_DATABASE', 'rafef_tech')),
    multipleStatements: false,
  });

  const rows = parseCsv(csvPath);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  await conn.beginTransaction();
  try {
    for (const row of rows) {
      const phones = normalizePhones(row['Phones Local']);
      if (phones.length === 0) {
        skipped += 1;
        continue;
      }

      const primaryPhone = phones[0];
      let customerId = await customerExistsByPhone(conn, primaryPhone);
      const name = cleanName(row);
      const email = row.Email || null;
      const notes = [row.Notes, row.Organization ? `Organization: ${row.Organization}` : '', row.Labels ? `Labels: ${row.Labels}` : '', row['Source Row'] ? `Imported source row: ${row['Source Row']}` : '']
        .filter(Boolean)
        .join('\n');

      if (!customerId) {
        const code = await nextCustomerCode(conn);
        const [result] = await conn.execute<mysql.ResultSetHeader>(
          `INSERT INTO crm_customers
           (customer_code, name, phone_primary, phone_secondary, email, customer_type, notes, is_active)
           VALUES (?, ?, ?, ?, ?, 'person', ?, 1)`,
          [code, name, primaryPhone, phones[1] || null, email, notes || null],
        );
        customerId = result.insertId;
        created += 1;
      } else {
        await conn.execute(
          `UPDATE crm_customers
           SET name = COALESCE(NULLIF(name, ''), ?),
               email = COALESCE(email, ?),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [name, email, customerId],
        );
        updated += 1;
      }

      for (let i = 0; i < phones.length; i += 1) {
        await ensureContact(conn, customerId, phones[i], i === 0);
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }

  console.log(JSON.stringify({ csvPath, created, updated, skipped, totalRows: rows.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
