import { pool } from '../../database/mysql.js';
async function one(sql) {
    const [rows] = await pool.query(sql);
    return rows[0] ?? {};
}
export class ReportsRepository {
    sales() {
        return one(`
      SELECT
        COUNT(*) invoices,
        COALESCE(SUM(total), 0) total,
        COALESCE(SUM(subtotal), 0) subtotal
      FROM sales_invoices
      WHERE document_type = 'invoice' AND status = 'approved'
    `);
    }
    inventory() {
        return one(`SELECT COUNT(*) products, COALESCE(SUM(quantity_on_hand),0) on_hand, COALESCE(SUM(quantity_reserved),0) reserved FROM inventory_stock_balances`);
    }
    finance() {
        return one(`SELECT
      COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE 0 END),0) incoming,
      COALESCE(SUM(CASE WHEN direction='out' THEN amount ELSE 0 END),0) outgoing,
      COUNT(*) transactions,
      COALESCE((SELECT SUM(amount) FROM finance_expenses), 0) expenses,
      COALESCE((SELECT SUM(amount) FROM finance_refunds), 0) refunds,
      COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE 0 END),0)
      - COALESCE(SUM(CASE WHEN direction='out' THEN amount ELSE 0 END),0)
      - COALESCE((SELECT SUM(amount) FROM finance_expenses), 0)
      - COALESCE((SELECT SUM(amount) FROM finance_refunds), 0) AS net
      FROM finance_transactions`);
    }
    repair() {
        return one(`SELECT COUNT(*) orders, SUM(status='delivered') delivered, SUM(status='in_repair') in_repair, SUM(status='cancelled') cancelled FROM repair_orders`);
    }
    projects() {
        return one(`SELECT COUNT(*) projects, SUM(status='completed') completed, SUM(status='in_progress') in_progress FROM projects`);
    }
    creative() {
        return one(`SELECT COUNT(*) jobs, SUM(status='draft') draft, SUM(status <> 'draft') active FROM creative_jobs`);
    }
}
