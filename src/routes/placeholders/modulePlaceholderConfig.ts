export type ModulePlaceholderConfig = {
  key: string;
  titleKey: string;
  descriptionKey: string;
  plannedItemKeys: string[];
};

export const MODULE_PLACEHOLDERS: Record<string, ModulePlaceholderConfig> = {
  customers: {
    key: 'customers',
    titleKey: 'navigation.customers',
    descriptionKey: 'placeholderDescriptions.customers',
    plannedItemKeys: ['customerList', 'customerProfile', 'contactsLocations', 'operationHistory'],
  },
  catalog: {
    key: 'catalog',
    titleKey: 'navigation.catalog',
    descriptionKey: 'placeholderDescriptions.catalog',
    plannedItemKeys: ['products', 'categories', 'barcodes', 'suppliers', 'priceHistory'],
  },
  inventory: {
    key: 'inventory',
    titleKey: 'navigation.inventory',
    descriptionKey: 'placeholderDescriptions.inventory',
    plannedItemKeys: ['stockBalances', 'movements', 'reservations', 'purchases', 'adjustments'],
  },
  repair: {
    key: 'repair',
    titleKey: 'navigation.repair',
    descriptionKey: 'placeholderDescriptions.repair',
    plannedItemKeys: ['repairOrders', 'devices', 'services', 'parts', 'statusHistory'],
  },
  sales: {
    key: 'sales',
    titleKey: 'navigation.sales',
    descriptionKey: 'placeholderDescriptions.sales',
    plannedItemKeys: ['pos', 'drafts', 'invoices', 'returns', 'receiptPrinting'],
  },
  finance: {
    key: 'finance',
    titleKey: 'navigation.finance',
    descriptionKey: 'placeholderDescriptions.finance',
    plannedItemKeys: ['paymentAccounts', 'payments', 'customerBalances', 'expenses', 'dailyClosing'],
  },
  creative: {
    key: 'creative',
    titleKey: 'navigation.creative',
    descriptionKey: 'placeholderDescriptions.creative',
    plannedItemKeys: ['jobs', 'specifications', 'vendors', 'vendorTasks'],
  },
  projects: {
    key: 'projects',
    titleKey: 'navigation.projects',
    descriptionKey: 'placeholderDescriptions.projects',
    plannedItemKeys: ['projects', 'materials', 'installedAssets', 'checklists'],
  },
  events: {
    key: 'events',
    titleKey: 'navigation.events',
    descriptionKey: 'placeholderDescriptions.events',
    plannedItemKeys: ['eventFeed', 'notifications', 'ticker', 'webhookOutbox'],
  },
  reports: {
    key: 'reports',
    titleKey: 'navigation.reports',
    descriptionKey: 'placeholderDescriptions.reports',
    plannedItemKeys: ['salesReports', 'inventoryReports', 'financeReports', 'repairReports', 'projectReports'],
  },
  settings: {
    key: 'settings',
    titleKey: 'navigation.settings',
    descriptionKey: 'placeholderDescriptions.settings',
    plannedItemKeys: ['users', 'roles', 'permissions', 'paymentMethods'],
  },
  integrations: {
    key: 'integrations',
    titleKey: 'navigation.integrations',
    descriptionKey: 'placeholderDescriptions.integrations',
    plannedItemKeys: ['integrationHealth', 'n8n', 'openClaw', 'telegram'],
  },
};
