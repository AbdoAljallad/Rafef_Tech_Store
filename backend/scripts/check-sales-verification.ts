import { pool } from '../src/database/mysql.js';

async function run() {
  const productId = 3;
  console.log('Checking stock balance for product', productId);
  const [rows] = await pool.execute<any[]>('SELECT * FROM inventory_stock_balances WHERE product_id = ?', [productId]);
  console.log('Balance rows:', rows);

  console.log('Recent audit logs for sales actions:');
  const [logs] = await pool.execute<any[]>(`SELECT id, action_code, module, entity_type, entity_id, created_at, new_values_json FROM auth_audit_log WHERE action_code LIKE 'sales.%' ORDER BY created_at DESC LIMIT 20`);
  for (const l of logs) {
    console.log(l.id, l.action_code, l.entity_type, l.entity_id, l.created_at);
  }

  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
