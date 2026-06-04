import { pool } from '../src/database/mysql.js';

async function run() {
  const orderId = 3;
  const reservationId = 7;
  console.log('=== reservations for order');
  const [resRows] = await pool.execute('SELECT * FROM inventory_stock_reservations WHERE source_type = ? AND source_id = ? ORDER BY id', ['repair_order', orderId]);
  console.log(JSON.stringify(resRows, null, 2));

  console.log('=== stock balance for product 3');
  const [balRows] = await pool.execute('SELECT * FROM inventory_stock_balances WHERE product_id = ?', [3]);
  console.log(JSON.stringify(balRows, null, 2));

  console.log('=== audit logs for repair_orders and reservations');
  const [auditRows] = await pool.execute(
    `SELECT * FROM auth_audit_log WHERE (entity_type = 'repair_orders' AND entity_id = ?) OR (entity_type = 'inventory_stock_reservations' AND entity_id = ?) ORDER BY id DESC LIMIT 20`,
    [orderId, reservationId],
  );
  console.log(JSON.stringify(auditRows, null, 2));

  console.log('=== events for repair_orders');
  const [eventRows] = await pool.execute('SELECT * FROM app_events WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC LIMIT 20', ['repair_orders', orderId]);
  console.log(JSON.stringify(eventRows, null, 2));

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
