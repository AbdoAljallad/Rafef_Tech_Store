import { pool } from '../../database/mysql.js';
import { normalizeUiLanguage } from '../../shared/localization/language.js';
import { localizedFieldExpression } from '../../shared/localization/sql.js';
const customerNameExpr = localizedFieldExpression({
    entityType: 'crm_customers',
    entityIdExpression: 'c.id',
    fieldName: 'name',
    fallbackExpression: 'c.name',
});
const productNameExpr = localizedFieldExpression({
    entityType: 'catalog_products',
    entityIdExpression: 'p.id',
    fieldName: 'default_name',
    fallbackExpression: 'p.default_name',
});
const categoryNameExpr = localizedFieldExpression({
    entityType: 'catalog_categories',
    entityIdExpression: 'c.id',
    fieldName: 'default_name',
    fallbackExpression: 'c.default_name',
});
const projectTypeNameExpr = localizedFieldExpression({
    entityType: 'project_types',
    entityIdExpression: 't.id',
    fieldName: 'default_name',
    fallbackExpression: 't.default_name',
});
const creativeJobTypeNameExpr = localizedFieldExpression({
    entityType: 'creative_job_types',
    entityIdExpression: 't.id',
    fieldName: 'default_name',
    fallbackExpression: 't.default_name',
});
const vendorNameExpr = localizedFieldExpression({
    entityType: 'creative_vendors',
    entityIdExpression: 'v.id',
    fieldName: 'name',
    fallbackExpression: 'v.name',
});
const invoiceProfitSubquery = `
  SELECT
    invoice_id,
    COALESCE(SUM(line_total - COALESCE(unit_cost, 0) * quantity), 0) AS estimated_profit
  FROM sales_invoice_lines
  GROUP BY invoice_id
`;
function buildDateFilter(column, filters, params, prefix) {
    const clauses = [];
    if (filters.dateFrom) {
        params[`${prefix}DateFrom`] = `${filters.dateFrom} 00:00:00`;
        clauses.push(`${column} >= :${prefix}DateFrom`);
    }
    if (filters.dateTo) {
        params[`${prefix}DateTo`] = filters.dateTo;
        clauses.push(`${column} < DATE_ADD(:${prefix}DateTo, INTERVAL 1 DAY)`);
    }
    return clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
}
async function one(sql, params = {}) {
    const [rows] = await pool.query(sql, params);
    return (rows[0] ?? {});
}
async function many(sql, params = {}) {
    const [rows] = await pool.query(sql, params);
    return rows;
}
function toReportRow(row) {
    return Object.fromEntries(Object.entries(row));
}
export class ReportsRepository {
    async sales(filters, language) {
        const params = { language: normalizeUiLanguage(language) };
        const dateFilter = buildDateFilter('i.created_at', filters, params, 'sales');
        const [summary, daily, topProducts, topCustomers, recentDocuments, statusBreakdown] = await Promise.all([
            one(`
          SELECT
            COALESCE(SUM(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN 1 ELSE 0 END), 0) AS invoices,
            COALESCE(SUM(CASE WHEN i.document_type = 'quote' THEN 1 ELSE 0 END), 0) AS quotes,
            COALESCE(SUM(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN i.total ELSE 0 END), 0) AS total,
            COALESCE(SUM(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN i.subtotal ELSE 0 END), 0) AS subtotal,
            COALESCE(AVG(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN i.total END), 0) AS average_ticket,
            COUNT(DISTINCT CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' AND i.customer_id IS NOT NULL THEN i.customer_id END) AS customers,
            COALESCE(SUM(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN COALESCE(p.estimated_profit, 0) ELSE 0 END), 0) AS estimated_profit
          FROM sales_invoices i
          LEFT JOIN (${invoiceProfitSubquery}) p ON p.invoice_id = i.id
          WHERE 1 = 1${dateFilter}
        `, params),
            many(`
          SELECT
            DATE(i.created_at) AS bucket,
            COUNT(*) AS documents,
            COALESCE(SUM(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN i.total ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN i.document_type = 'quote' THEN 1 ELSE 0 END), 0) AS quotes,
            COALESCE(SUM(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN COALESCE(p.estimated_profit, 0) ELSE 0 END), 0) AS estimated_profit
          FROM sales_invoices i
          LEFT JOIN (${invoiceProfitSubquery}) p ON p.invoice_id = i.id
          WHERE 1 = 1${dateFilter}
          GROUP BY DATE(i.created_at)
          ORDER BY bucket DESC
          LIMIT 14
        `, params),
            many(`
          SELECT
            grouped.product_id,
            grouped.sku,
            CASE
              WHEN grouped.product_id = 0 THEN grouped.manual_name
              ELSE COALESCE(${productNameExpr}, grouped.manual_name, 'Manual line')
            END AS product_name,
            grouped.quantity,
            grouped.revenue,
            grouped.estimated_profit
          FROM (
            SELECT
              COALESCE(p.id, 0) AS product_id,
              COALESCE(p.sku, l.sku_snapshot, 'MANUAL') AS sku,
              CASE WHEN p.id IS NULL THEN COALESCE(l.description_snapshot, 'Manual line') ELSE 'Manual line' END AS manual_name,
              SUM(l.quantity) AS quantity,
              SUM(l.line_total) AS revenue,
              SUM(l.line_total - COALESCE(l.unit_cost, 0) * l.quantity) AS estimated_profit
            FROM sales_invoice_lines l
            INNER JOIN sales_invoices i ON i.id = l.invoice_id
            LEFT JOIN catalog_products p ON p.id = l.product_id
            WHERE i.document_type = 'invoice' AND i.status = 'approved'${dateFilter}
            GROUP BY
              COALESCE(p.id, 0),
              COALESCE(p.sku, l.sku_snapshot, 'MANUAL'),
              CASE WHEN p.id IS NULL THEN COALESCE(l.description_snapshot, 'Manual line') ELSE 'Manual line' END
          ) grouped
          LEFT JOIN catalog_products p ON p.id = grouped.product_id
          ORDER BY grouped.revenue DESC, grouped.quantity DESC
          LIMIT 8
        `, params),
            many(`
          SELECT
            c.id AS customer_id,
            c.customer_code,
            ANY_VALUE(${customerNameExpr}) AS customer_name,
            COUNT(*) AS documents,
            SUM(i.total) AS revenue
          FROM sales_invoices i
          INNER JOIN crm_customers c ON c.id = i.customer_id
          WHERE i.document_type = 'invoice' AND i.status = 'approved' AND i.customer_id IS NOT NULL${dateFilter}
          GROUP BY c.id, c.customer_code
          ORDER BY revenue DESC, documents DESC
          LIMIT 8
        `, params),
            many(`
          SELECT
            i.id,
            i.invoice_code,
            i.document_type,
            i.status,
            i.total,
            i.created_at,
            ${customerNameExpr} AS customer_name
          FROM sales_invoices i
          LEFT JOIN crm_customers c ON c.id = i.customer_id
          WHERE 1 = 1${dateFilter}
          ORDER BY i.created_at DESC, i.id DESC
          LIMIT 12
        `, params),
            many(`
          SELECT
            i.status,
            COUNT(*) AS documents,
            COALESCE(SUM(CASE WHEN i.document_type = 'invoice' AND i.status = 'approved' THEN i.total ELSE 0 END), 0) AS revenue
          FROM sales_invoices i
          WHERE 1 = 1${dateFilter}
          GROUP BY i.status
          ORDER BY documents DESC, i.status ASC
        `, params),
        ]);
        return {
            report: toReportRow(summary),
            daily,
            topProducts,
            topCustomers,
            recentDocuments,
            statusBreakdown,
        };
    }
    async inventory(filters, language) {
        const movementParams = { language: normalizeUiLanguage(language) };
        const movementDateFilter = buildDateFilter('m.created_at', filters, movementParams, 'inventoryMovement');
        const [snapshot, movementSummary, lowStock, topReserved, recentMovements, movementTypes] = await Promise.all([
            one(`
          SELECT
            COUNT(*) AS products,
            COALESCE(SUM(b.quantity_on_hand), 0) AS on_hand,
            COALESCE(SUM(b.quantity_reserved), 0) AS reserved,
            COALESCE(SUM(GREATEST(b.quantity_on_hand - b.quantity_reserved, 0)), 0) AS available,
            COALESCE(SUM(CASE WHEN p.reorder_threshold > 0 AND b.quantity_on_hand <= p.reorder_threshold THEN 1 ELSE 0 END), 0) AS low_stock,
            COALESCE(SUM(b.quantity_on_hand * p.current_purchase_price), 0) AS stock_cost_value,
            COALESCE(SUM(b.quantity_on_hand * p.current_sale_price), 0) AS stock_sale_value
          FROM inventory_stock_balances b
          INNER JOIN catalog_products p ON p.id = b.product_id
          WHERE p.is_active = TRUE
        `),
            one(`
          SELECT
            COUNT(*) AS movements,
            COALESCE(SUM(CASE WHEN m.movement_type IN ('purchase_in', 'adjustment_in') THEN m.quantity ELSE 0 END), 0) AS incoming_qty,
            COALESCE(SUM(CASE WHEN m.movement_type IN ('adjustment_out', 'reservation_consume') THEN m.quantity ELSE 0 END), 0) AS outgoing_qty
          FROM inventory_stock_movements m
          WHERE 1 = 1${movementDateFilter}
        `, movementParams),
            many(`
          SELECT
            p.id AS product_id,
            p.sku,
            ${productNameExpr} AS product_name,
            b.quantity_on_hand,
            b.quantity_reserved,
            p.reorder_threshold
          FROM inventory_stock_balances b
          INNER JOIN catalog_products p ON p.id = b.product_id
          WHERE p.is_active = TRUE
            AND p.reorder_threshold > 0
            AND b.quantity_on_hand <= p.reorder_threshold
          ORDER BY (p.reorder_threshold - b.quantity_on_hand) DESC, b.quantity_on_hand ASC
          LIMIT 10
        `),
            many(`
          SELECT
            p.id AS product_id,
            p.sku,
            ${productNameExpr} AS product_name,
            b.quantity_reserved,
            b.quantity_on_hand
          FROM inventory_stock_balances b
          INNER JOIN catalog_products p ON p.id = b.product_id
          WHERE p.is_active = TRUE AND b.quantity_reserved > 0
          ORDER BY b.quantity_reserved DESC, b.quantity_on_hand DESC
          LIMIT 10
        `),
            many(`
          SELECT
            m.id,
            m.movement_type,
            m.quantity,
            m.unit_cost,
            m.source_type,
            m.created_at,
            p.sku,
            ${productNameExpr} AS product_name
          FROM inventory_stock_movements m
          INNER JOIN catalog_products p ON p.id = m.product_id
          WHERE 1 = 1${movementDateFilter}
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 12
        `, movementParams),
            many(`
          SELECT
            m.movement_type,
            COUNT(*) AS movements,
            COALESCE(SUM(m.quantity), 0) AS quantity
          FROM inventory_stock_movements m
          WHERE 1 = 1${movementDateFilter}
          GROUP BY m.movement_type
          ORDER BY quantity DESC, movements DESC
        `, movementParams),
        ]);
        return {
            report: {
                ...toReportRow(snapshot),
                movements: movementSummary.movements ?? 0,
                incoming_qty: movementSummary.incoming_qty ?? 0,
                outgoing_qty: movementSummary.outgoing_qty ?? 0,
            },
            lowStock,
            topReserved,
            recentMovements,
            movementTypes,
        };
    }
    async finance(filters) {
        const txParams = {};
        const expenseParams = {};
        const refundParams = {};
        const txDateFilter = buildDateFilter('t.created_at', filters, txParams, 'financeTx');
        const expenseDateFilter = buildDateFilter('e.created_at', filters, expenseParams, 'financeExpense');
        const refundDateFilter = buildDateFilter('COALESCE(r.processed_at, r.created_at)', filters, refundParams, 'financeRefund');
        const [summary, byOperation, recentTransactions, daily] = await Promise.all([
            one(`
          SELECT
            COALESCE((SELECT SUM(t.amount) FROM finance_transactions t WHERE t.direction = 'in'${txDateFilter}), 0) AS incoming,
            COALESCE((SELECT SUM(t.amount) FROM finance_transactions t WHERE t.direction = 'out'${txDateFilter}), 0) AS outgoing,
            COALESCE((SELECT COUNT(*) FROM finance_transactions t WHERE 1 = 1${txDateFilter}), 0) AS transactions,
            COALESCE((SELECT SUM(e.amount) FROM finance_expenses e WHERE 1 = 1${expenseDateFilter}), 0) AS expenses,
            COALESCE((SELECT SUM(r.amount) FROM finance_refunds r WHERE 1 = 1${refundDateFilter}), 0) AS refunds
        `, { ...txParams, ...expenseParams, ...refundParams }),
            many(`
          SELECT
            t.operation_type,
            COUNT(*) AS transactions,
            COALESCE(SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE 0 END), 0) AS incoming,
            COALESCE(SUM(CASE WHEN t.direction = 'out' THEN t.amount ELSE 0 END), 0) AS outgoing
          FROM finance_transactions t
          WHERE 1 = 1${txDateFilter}
          GROUP BY t.operation_type
          ORDER BY transactions DESC, t.operation_type ASC
        `, txParams),
            many(`
          SELECT
            t.id,
            t.transaction_code,
            t.amount,
            t.currency,
            t.direction,
            t.operation_type,
            t.counterparty_name,
            t.created_at,
            a.name AS account_name,
            m.name AS method_name
          FROM finance_transactions t
          LEFT JOIN finance_payment_accounts a ON a.id = t.account_id
          LEFT JOIN finance_payment_methods m ON m.id = t.payment_method_id
          WHERE 1 = 1${txDateFilter}
          ORDER BY t.created_at DESC, t.id DESC
          LIMIT 12
        `, txParams),
            many(`
          SELECT
            flow.bucket,
            SUM(flow.incoming) AS incoming,
            SUM(flow.outgoing) AS outgoing,
            SUM(flow.expenses) AS expenses,
            SUM(flow.refunds) AS refunds,
            SUM(flow.incoming) - SUM(flow.outgoing) - SUM(flow.expenses) - SUM(flow.refunds) AS net
          FROM (
            SELECT
              DATE(t.created_at) AS bucket,
              SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE 0 END) AS incoming,
              SUM(CASE WHEN t.direction = 'out' THEN t.amount ELSE 0 END) AS outgoing,
              0 AS expenses,
              0 AS refunds
            FROM finance_transactions t
            WHERE 1 = 1${txDateFilter}
            GROUP BY DATE(t.created_at)

            UNION ALL

            SELECT
              DATE(e.created_at) AS bucket,
              0 AS incoming,
              0 AS outgoing,
              SUM(e.amount) AS expenses,
              0 AS refunds
            FROM finance_expenses e
            WHERE 1 = 1${expenseDateFilter}
            GROUP BY DATE(e.created_at)

            UNION ALL

            SELECT
              DATE(COALESCE(r.processed_at, r.created_at)) AS bucket,
              0 AS incoming,
              0 AS outgoing,
              0 AS expenses,
              SUM(r.amount) AS refunds
            FROM finance_refunds r
            WHERE 1 = 1${refundDateFilter}
            GROUP BY DATE(COALESCE(r.processed_at, r.created_at))
          ) flow
          GROUP BY flow.bucket
          ORDER BY flow.bucket DESC
          LIMIT 14
        `, { ...txParams, ...expenseParams, ...refundParams }),
        ]);
        return {
            report: {
                ...toReportRow(summary),
                net: Number(summary.incoming ?? 0)
                    - Number(summary.outgoing ?? 0)
                    - Number(summary.expenses ?? 0)
                    - Number(summary.refunds ?? 0),
            },
            byOperation,
            recentTransactions,
            daily,
        };
    }
    async repair(filters, language) {
        const params = { language: normalizeUiLanguage(language) };
        const dateFilter = buildDateFilter('o.created_at', filters, params, 'repair');
        const [summary, statusBreakdown, recentOrders, ageingQueue] = await Promise.all([
            one(`
          SELECT
            COUNT(*) AS orders,
            COALESCE(SUM(o.status = 'delivered'), 0) AS delivered,
            COALESCE(SUM(o.status = 'in_repair'), 0) AS in_repair,
            COALESCE(SUM(o.status = 'cancelled'), 0) AS cancelled,
            COALESCE(SUM(o.status IN ('new', 'inspection', 'waiting_customer_approval', 'waiting_part', 'in_repair', 'ready_for_delivery')), 0) AS active,
            COALESCE(SUM(o.status IN ('waiting_customer_approval', 'waiting_part')), 0) AS waiting
          FROM repair_orders o
          WHERE 1 = 1${dateFilter}
        `, params),
            many(`
          SELECT
            o.status,
            COUNT(*) AS orders
          FROM repair_orders o
          WHERE 1 = 1${dateFilter}
          GROUP BY o.status
          ORDER BY orders DESC, o.status ASC
        `, params),
            many(`
          SELECT
            o.id,
            o.order_code,
            o.status,
            o.created_at,
            o.updated_at,
            ${customerNameExpr} AS customer_name,
            d.device_name
          FROM repair_orders o
          INNER JOIN crm_customers c ON c.id = o.customer_id
          INNER JOIN repair_devices d ON d.id = o.device_id
          WHERE 1 = 1${dateFilter}
          ORDER BY o.created_at DESC, o.id DESC
          LIMIT 12
        `, params),
            many(`
          SELECT
            o.id,
            o.order_code,
            o.status,
            ${customerNameExpr} AS customer_name,
            d.device_name,
            o.created_at,
            o.updated_at,
            DATEDIFF(CURRENT_DATE, DATE(o.created_at)) AS age_days
          FROM repair_orders o
          INNER JOIN crm_customers c ON c.id = o.customer_id
          INNER JOIN repair_devices d ON d.id = o.device_id
          WHERE o.status NOT IN ('delivered', 'cancelled')${dateFilter}
          ORDER BY age_days DESC, o.updated_at ASC
          LIMIT 10
        `, params),
        ]);
        return {
            report: toReportRow(summary),
            statusBreakdown,
            recentOrders,
            ageingQueue,
        };
    }
    async projects(filters, language) {
        const params = { language: normalizeUiLanguage(language) };
        const dateFilter = buildDateFilter('p.created_at', filters, params, 'projects');
        const [summary, statusBreakdown, recentProjects, deadlineRisk] = await Promise.all([
            one(`
          SELECT
            COUNT(*) AS projects,
            COALESCE(SUM(p.status = 'completed'), 0) AS completed,
            COALESCE(SUM(p.status = 'in_progress'), 0) AS in_progress,
            COALESCE(SUM(p.status = 'on_hold'), 0) AS on_hold,
            COALESCE(SUM(p.status NOT IN ('completed', 'cancelled')), 0) AS active
          FROM projects p
          WHERE 1 = 1${dateFilter}
        `, params),
            many(`
          SELECT
            p.status,
            COUNT(*) AS projects
          FROM projects p
          WHERE 1 = 1${dateFilter}
          GROUP BY p.status
          ORDER BY projects DESC, p.status ASC
        `, params),
            many(`
          SELECT
            p.id,
            p.project_code,
            p.title,
            p.status,
            p.created_at,
            p.planned_end_at,
            ${customerNameExpr} AS customer_name,
            ${projectTypeNameExpr} AS project_type
          FROM projects p
          LEFT JOIN crm_customers c ON c.id = p.customer_id
          LEFT JOIN project_types t ON t.id = p.project_type_id
          WHERE 1 = 1${dateFilter}
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT 12
        `, params),
            many(`
          SELECT
            p.id,
            p.project_code,
            p.title,
            p.status,
            p.planned_end_at,
            ${customerNameExpr} AS customer_name,
            DATEDIFF(DATE(p.planned_end_at), CURRENT_DATE) AS days_to_deadline
          FROM projects p
          LEFT JOIN crm_customers c ON c.id = p.customer_id
          WHERE p.status NOT IN ('completed', 'cancelled')
            AND p.planned_end_at IS NOT NULL${dateFilter}
            AND p.planned_end_at <= DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)
          ORDER BY p.planned_end_at ASC, p.id DESC
          LIMIT 10
        `, params),
        ]);
        return {
            report: toReportRow(summary),
            statusBreakdown,
            recentProjects,
            deadlineRisk,
        };
    }
    async creative(filters, language) {
        const params = { language: normalizeUiLanguage(language) };
        const dateFilter = buildDateFilter('j.created_at', filters, params, 'creative');
        const [summary, statusBreakdown, recentJobs, vendorQueue] = await Promise.all([
            one(`
          SELECT
            COUNT(*) AS jobs,
            COALESCE(SUM(j.status = 'draft'), 0) AS draft,
            COALESCE(SUM(j.status = 'completed'), 0) AS completed,
            COALESCE(SUM(j.status NOT IN ('draft', 'completed', 'cancelled')), 0) AS active,
            COALESCE(SUM(j.deadline_at IS NOT NULL AND j.deadline_at < CURRENT_TIMESTAMP AND j.status NOT IN ('completed', 'cancelled')), 0) AS overdue
          FROM creative_jobs j
          WHERE 1 = 1${dateFilter}
        `, params),
            many(`
          SELECT
            j.status,
            COUNT(*) AS jobs
          FROM creative_jobs j
          WHERE 1 = 1${dateFilter}
          GROUP BY j.status
          ORDER BY jobs DESC, j.status ASC
        `, params),
            many(`
          SELECT
            j.id,
            j.job_code,
            j.title,
            j.status,
            j.deadline_at,
            j.created_at,
            ${customerNameExpr} AS customer_name,
            ${creativeJobTypeNameExpr} AS job_type
          FROM creative_jobs j
          LEFT JOIN crm_customers c ON c.id = j.customer_id
          LEFT JOIN creative_job_types t ON t.id = j.job_type_id
          WHERE 1 = 1${dateFilter}
          ORDER BY j.created_at DESC, j.id DESC
          LIMIT 12
        `, params),
            many(`
          SELECT
            v.id AS vendor_id,
            ANY_VALUE(${vendorNameExpr}) AS vendor_name,
            COUNT(*) AS tasks,
            COALESCE(SUM(vt.status IN ('pending', 'in_progress')), 0) AS active_tasks
          FROM creative_vendor_tasks vt
          INNER JOIN creative_vendors v ON v.id = vt.vendor_id
          INNER JOIN creative_jobs j ON j.id = vt.job_id
          WHERE 1 = 1${dateFilter}
          GROUP BY v.id
          ORDER BY active_tasks DESC, tasks DESC
          LIMIT 10
        `, params),
        ]);
        return {
            report: toReportRow(summary),
            statusBreakdown,
            recentJobs,
            vendorQueue,
        };
    }
    async customers(filters, language) {
        const summaryParams = { language: normalizeUiLanguage(language) };
        const customerDateFilter = buildDateFilter('c.created_at', filters, summaryParams, 'customerSummary');
        const salesDateFilter = buildDateFilter('i.created_at', filters, summaryParams, 'customerSales');
        const [summary, topCustomers, recentCustomers, customerTypes] = await Promise.all([
            one(`
          SELECT
            COALESCE((SELECT COUNT(*) FROM crm_customers c WHERE 1 = 1${customerDateFilter}), 0) AS customers,
            COALESCE((SELECT COUNT(*) FROM crm_customers c WHERE c.customer_type = 'business'${customerDateFilter}), 0) AS business,
            COALESCE((SELECT COUNT(*) FROM crm_customers c WHERE c.customer_type = 'person'${customerDateFilter}), 0) AS person,
            COALESCE((SELECT COUNT(DISTINCT i.customer_id)
              FROM sales_invoices i
              WHERE i.document_type = 'invoice' AND i.status = 'approved' AND i.customer_id IS NOT NULL${salesDateFilter}), 0) AS active_buyers,
            COALESCE((SELECT SUM(i.total)
              FROM sales_invoices i
              WHERE i.document_type = 'invoice' AND i.status = 'approved' AND i.customer_id IS NOT NULL${salesDateFilter}), 0) AS billed_total
        `, summaryParams),
            many(`
          SELECT
            c.id AS customer_id,
            c.customer_code,
            ANY_VALUE(${customerNameExpr}) AS customer_name,
            COUNT(*) AS documents,
            SUM(i.total) AS revenue
          FROM sales_invoices i
          INNER JOIN crm_customers c ON c.id = i.customer_id
          WHERE i.document_type = 'invoice' AND i.status = 'approved' AND i.customer_id IS NOT NULL${salesDateFilter}
          GROUP BY c.id, c.customer_code
          ORDER BY revenue DESC, documents DESC
          LIMIT 10
        `, summaryParams),
            many(`
          SELECT
            c.id AS customer_id,
            c.customer_code,
            ${customerNameExpr} AS customer_name,
            c.customer_type,
            c.phone_primary,
            c.created_at
          FROM crm_customers c
          WHERE 1 = 1${customerDateFilter}
          ORDER BY c.created_at DESC, c.id DESC
          LIMIT 12
        `, summaryParams),
            many(`
          SELECT
            c.customer_type,
            COUNT(*) AS customers
          FROM crm_customers c
          WHERE 1 = 1${customerDateFilter}
          GROUP BY c.customer_type
          ORDER BY customers DESC, c.customer_type ASC
        `, summaryParams),
        ]);
        return {
            report: toReportRow(summary),
            topCustomers,
            recentCustomers,
            customerTypes,
        };
    }
    async profit(filters, language) {
        const params = { language: normalizeUiLanguage(language) };
        const dateFilter = buildDateFilter('i.created_at', filters, params, 'profit');
        const [summary, byLineType, topProducts, daily] = await Promise.all([
            one(`
          SELECT
            COALESCE(SUM(l.line_total), 0) AS revenue,
            COALESCE(SUM(COALESCE(l.unit_cost, 0) * l.quantity), 0) AS estimated_cost,
            COALESCE(SUM(l.line_total - COALESCE(l.unit_cost, 0) * l.quantity), 0) AS estimated_profit,
            COUNT(DISTINCT i.id) AS invoices,
            COALESCE(SUM(CASE WHEN i.repair_order_id IS NOT NULL THEN l.line_total ELSE 0 END), 0) AS repair_revenue,
            COALESCE(SUM(CASE WHEN i.project_id IS NOT NULL THEN l.line_total ELSE 0 END), 0) AS project_revenue,
            COALESCE(SUM(CASE WHEN i.repair_order_id IS NULL AND i.project_id IS NULL THEN l.line_total ELSE 0 END), 0) AS direct_sales_revenue
          FROM sales_invoice_lines l
          INNER JOIN sales_invoices i ON i.id = l.invoice_id
          WHERE i.document_type = 'invoice' AND i.status = 'approved'${dateFilter}
        `, params),
            many(`
          SELECT
            l.line_type,
            COALESCE(SUM(l.line_total), 0) AS revenue,
            COALESCE(SUM(COALESCE(l.unit_cost, 0) * l.quantity), 0) AS estimated_cost,
            COALESCE(SUM(l.line_total - COALESCE(l.unit_cost, 0) * l.quantity), 0) AS estimated_profit
          FROM sales_invoice_lines l
          INNER JOIN sales_invoices i ON i.id = l.invoice_id
          WHERE i.document_type = 'invoice' AND i.status = 'approved'${dateFilter}
          GROUP BY l.line_type
          ORDER BY estimated_profit DESC, revenue DESC
        `, params),
            many(`
          SELECT
            grouped.product_id,
            grouped.sku,
            CASE
              WHEN grouped.product_id = 0 THEN grouped.manual_name
              ELSE COALESCE(${productNameExpr}, grouped.manual_name, 'Manual line')
            END AS product_name,
            grouped.revenue,
            grouped.estimated_cost,
            grouped.estimated_profit
          FROM (
            SELECT
              COALESCE(p.id, 0) AS product_id,
              COALESCE(p.sku, l.sku_snapshot, 'MANUAL') AS sku,
              CASE WHEN p.id IS NULL THEN COALESCE(l.description_snapshot, 'Manual line') ELSE 'Manual line' END AS manual_name,
              SUM(l.line_total) AS revenue,
              SUM(COALESCE(l.unit_cost, 0) * l.quantity) AS estimated_cost,
              SUM(l.line_total - COALESCE(l.unit_cost, 0) * l.quantity) AS estimated_profit
            FROM sales_invoice_lines l
            INNER JOIN sales_invoices i ON i.id = l.invoice_id
            LEFT JOIN catalog_products p ON p.id = l.product_id
            WHERE i.document_type = 'invoice' AND i.status = 'approved'${dateFilter}
            GROUP BY
              COALESCE(p.id, 0),
              COALESCE(p.sku, l.sku_snapshot, 'MANUAL'),
              CASE WHEN p.id IS NULL THEN COALESCE(l.description_snapshot, 'Manual line') ELSE 'Manual line' END
          ) grouped
          LEFT JOIN catalog_products p ON p.id = grouped.product_id
          ORDER BY grouped.estimated_profit DESC, grouped.revenue DESC
          LIMIT 10
        `, params),
            many(`
          SELECT
            DATE(i.created_at) AS bucket,
            COALESCE(SUM(l.line_total), 0) AS revenue,
            COALESCE(SUM(COALESCE(l.unit_cost, 0) * l.quantity), 0) AS estimated_cost,
            COALESCE(SUM(l.line_total - COALESCE(l.unit_cost, 0) * l.quantity), 0) AS estimated_profit
          FROM sales_invoice_lines l
          INNER JOIN sales_invoices i ON i.id = l.invoice_id
          WHERE i.document_type = 'invoice' AND i.status = 'approved'${dateFilter}
          GROUP BY DATE(i.created_at)
          ORDER BY bucket DESC
          LIMIT 14
        `, params),
        ]);
        const revenue = Number(summary.revenue ?? 0);
        const estimatedProfit = Number(summary.estimated_profit ?? 0);
        return {
            report: {
                ...toReportRow(summary),
                margin_percent: revenue > 0 ? (estimatedProfit / revenue) * 100 : 0,
            },
            byLineType,
            topProducts,
            daily,
        };
    }
}
