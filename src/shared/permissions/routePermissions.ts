import { PERMISSIONS } from './permissionCodes';

export type ModuleNavItem = {
  key: string;
  path: string;
  permission?: string;
};

export const MODULE_NAV_ITEMS: ModuleNavItem[] = [
  { key: 'customers', path: '/customers', permission: PERMISSIONS.CRM_CUSTOMERS_VIEW },
  { key: 'catalog', path: '/catalog/products', permission: PERMISSIONS.CATALOG_PRODUCTS_VIEW },
  { key: 'inventory', path: '/inventory/stock', permission: PERMISSIONS.INVENTORY_STOCK_VIEW },
  { key: 'repair', path: '/repair/orders', permission: PERMISSIONS.REPAIR_ORDERS_VIEW },
  { key: 'sales', path: '/sales/pos', permission: PERMISSIONS.SALES_INVOICES_CREATE },
  { key: 'finance', path: '/finance/accounts', permission: PERMISSIONS.FINANCE_ACCOUNTS_VIEW },
  { key: 'creative', path: '/creative/jobs', permission: PERMISSIONS.CREATIVE_JOBS_VIEW },
  { key: 'projects', path: '/projects', permission: PERMISSIONS.PROJECTS_VIEW },
  { key: 'events', path: '/events', permission: PERMISSIONS.EVENTS_VIEW },
  { key: 'reports', path: '/reports' },
  { key: 'settings', path: '/settings' },
  { key: 'integrations', path: '/integrations/health', permission: PERMISSIONS.INTEGRATIONS_VIEW },
];

export const ROUTE_PERMISSIONS = new Map(MODULE_NAV_ITEMS.map((item) => [item.path, item.permission]));
