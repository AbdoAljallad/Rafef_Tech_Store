export const PERMISSIONS = {
  CRM_CUSTOMERS_VIEW: 'crm.customers.view',
  CATALOG_PRODUCTS_VIEW: 'catalog.products.view',
  INVENTORY_STOCK_VIEW: 'inventory.stock.view',
  REPAIR_ORDERS_VIEW: 'repair.orders.view',
  SALES_INVOICES_CREATE: 'sales.invoices.create',
  FINANCE_ACCOUNTS_VIEW: 'finance.accounts.view',
  CREATIVE_JOBS_VIEW: 'creative.jobs.view',
  PROJECTS_VIEW: 'projects.view',
  EVENTS_VIEW: 'events.view',
  REPORTS_SALES_VIEW: 'reports.sales.view',
  AUTH_USERS_VIEW: 'auth.users.view',
  INTEGRATIONS_VIEW: 'integrations.view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
