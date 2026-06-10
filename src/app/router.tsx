import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './router/ProtectedRoute';
import { PublicOnlyRoute } from './router/PublicOnlyRoute';
import { CommandCenterPage } from '../routes/command-center/CommandCenterPage';
import { BarcodeLookupPage } from '../routes/catalog/BarcodeLookupPage';
import { CategoriesPage } from '../routes/catalog/CategoriesPage';
import { ProductDetailPage } from '../routes/catalog/ProductDetailPage';
import { ProductsPage } from '../routes/catalog/ProductsPage';
import { ServicesPage } from '../routes/catalog/ServicesPage';
import { CustomerDetailPage } from '../routes/customers/CustomerDetailPage';
import { CustomersPage } from '../routes/customers/CustomersPage';
import { HomePage } from '../routes/home/HomePage';
import { InventoryAdjustmentsPage } from '../routes/inventory/InventoryAdjustmentsPage';
import { InventoryMovementsPage } from '../routes/inventory/InventoryMovementsPage';
import { InventoryPurchasesPage } from '../routes/inventory/InventoryPurchasesPage';
import { InventoryReservationsPage } from '../routes/inventory/InventoryReservationsPage';
import { InventoryStockPage } from '../routes/inventory/InventoryStockPage';
import { OrdersPage } from '../routes/repair/OrdersPage';
import { OrderDetailPage } from '../routes/repair/OrderDetailPage';
import { DevicesPage } from '../routes/repair/DevicesPage';
import { ReceiptPage } from '../routes/repair/ReceiptPage';
import { PosPage } from '../routes/sales/PosPage';
import { InvoiceDetailPage } from '../routes/sales/InvoiceDetailPage';
import { SalesReceiptPage } from '../routes/sales/SalesReceiptPage';
import { SalesHistoryPage } from '../routes/sales/SalesHistoryPage';
import { LoginPage } from '../routes/login/LoginPage';
import { NotFoundPage } from '../routes/not-found/NotFoundPage';
import { ModulePlaceholderPage } from '../routes/placeholders/ModulePlaceholderPage';
import { JobTypesPage } from '../routes/creative/JobTypesPage';
import { VendorsPage } from '../routes/creative/VendorsPage';
import { JobsPage } from '../routes/creative/JobsPage';
import { JobDetailPage } from '../routes/creative/JobDetailPage';
import { ProjectDetailPage } from '../routes/projects/ProjectDetailPage';
import { ProjectSummaryPage } from '../routes/projects/ProjectSummaryPage';
import { ProjectTypesPage } from '../routes/projects/ProjectTypesPage';
import { ProjectsPage } from '../routes/projects/ProjectsPage';
import { RouteErrorPage } from '../routes/error/RouteErrorPage';
import { RequirePermission } from '../shared/permissions/RequirePermission';
import { ROUTE_PERMISSIONS } from '../shared/permissions/routePermissions';
import { AccountsPage } from '../routes/finance/AccountsPage';
import { MethodsPage } from '../routes/finance/MethodsPage';
import { TransactionsPage } from '../routes/finance/TransactionsPage';
import { LedgerPage } from '../routes/finance/LedgerPage';
import { ExpensesPage } from '../routes/finance/ExpensesPage';
import { RefundsPage } from '../routes/finance/RefundsPage';
import { WorkSessionsPage } from '../routes/finance/WorkSessionsPage';
import { DailyClosingPage } from '../routes/finance/DailyClosingPage';
import { ReportsPage } from '../routes/reports/ReportsPage';
import { IntegrationHealthPage } from '../routes/integrations/IntegrationHealthPage';
import { SettingsPage } from '../routes/settings/SettingsPage';
import { SettingsProfilePage } from '../routes/settings/SettingsProfilePage';
import { SettingsUsersPage } from '../routes/settings/SettingsUsersPage';
import { EventsPage } from '../routes/events/EventsPage';

function withPermission(path: string, element: ReactElement) {
  return <RequirePermission permission={ROUTE_PERMISSIONS.get(path)}>{element}</RequirePermission>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/home" replace />,
          },
          {
            path: 'home',
            element: <HomePage />,
          },
          {
            path: 'command-center',
            element: <CommandCenterPage />,
          },
          {
            path: 'customers',
            element: withPermission('/customers', <CustomersPage />),
          },
          {
            path: 'customers/:id',
            element: <RequirePermission permission="crm.customers.view"><CustomerDetailPage /></RequirePermission>,
          },
          {
            path: 'catalog/products',
            element: withPermission('/catalog/products', <ProductsPage />),
          },
          {
            path: 'catalog/products/:id',
            element: <RequirePermission permission="catalog.products.view"><ProductDetailPage /></RequirePermission>,
          },
          {
            path: 'catalog/barcode',
            element: <RequirePermission permission="catalog.products.view"><BarcodeLookupPage /></RequirePermission>,
          },
          {
            path: 'catalog/categories',
            element: <RequirePermission permission="catalog.products.view"><CategoriesPage /></RequirePermission>,
          },
          {
            path: 'catalog/services',
            element: <RequirePermission permission="catalog.products.view"><ServicesPage /></RequirePermission>,
          },
          {
            path: 'inventory/stock',
            element: withPermission('/inventory/stock', <InventoryStockPage />),
          },
          {
            path: 'inventory/movements',
            element: <RequirePermission permission="inventory.stock.view"><InventoryMovementsPage /></RequirePermission>,
          },
          {
            path: 'inventory/reservations',
            element: <RequirePermission permission="inventory.reservations.manage"><InventoryReservationsPage /></RequirePermission>,
          },
          {
            path: 'inventory/purchases',
            element: <RequirePermission permission="inventory.purchases.manage"><InventoryPurchasesPage /></RequirePermission>,
          },
          {
            path: 'inventory/adjustments',
            element: <RequirePermission permission="inventory.stock.adjust"><InventoryAdjustmentsPage /></RequirePermission>,
          },
          {
            path: 'repair/orders',
            element: withPermission('/repair/orders', <Navigate to="/repair/orders/list" replace />),
          },
          {
            path: 'repair/orders/list',
            element: withPermission('/repair/orders', <RequirePermission permission="repair.orders.view"><OrdersPage /></RequirePermission>),
          },
          {
            path: 'repair/orders/:id',
            element: <RequirePermission permission="repair.orders.view"><OrderDetailPage /></RequirePermission>,
          },
          {
            path: 'repair/orders/:id/receipt',
            element: <RequirePermission permission="repair.orders.view"><ReceiptPage /></RequirePermission>,
          },
          {
            path: 'repair/devices',
            element: <RequirePermission permission="repair.orders.view"><DevicesPage /></RequirePermission>,
          },
          {
            path: 'sales/pos',
            element: withPermission('/sales/pos', <RequirePermission permission="sales.invoices.create"><PosPage /></RequirePermission>),
          },
          {
            path: 'sales/invoices',
            element: <RequirePermission permission="sales.invoices.view"><SalesHistoryPage /></RequirePermission>,
          },
          {
            path: 'sales/invoices/:id',
            element: <RequirePermission permission="sales.invoices.view"><InvoiceDetailPage /></RequirePermission>,
          },
          {
            path: 'sales/invoices/:id/print',
            element: <RequirePermission permission="sales.invoices.view"><SalesReceiptPage /></RequirePermission>,
          },
          {
            path: 'sales/invoices/:id/receipt',
            element: <RequirePermission permission="sales.invoices.view"><SalesReceiptPage /></RequirePermission>,
          },
          {
            path: 'finance/accounts',
            element: withPermission('/finance/accounts', <RequirePermission permission="finance.accounts.view"><AccountsPage /></RequirePermission>),
          },
          {
            path: 'finance/payment-methods',
            element: <RequirePermission permission="finance.payments.create"><MethodsPage /></RequirePermission>,
          },
          {
            path: 'finance/transactions',
            element: <RequirePermission permission="finance.payments.create"><TransactionsPage /></RequirePermission>,
          },
          {
            path: 'finance/customers/:id/ledger-entry',
            element: <RequirePermission permission="finance.ledger.view"><LedgerPage /></RequirePermission>,
          },
          {
            path: 'finance/expenses',
            element: <RequirePermission permission="finance.expenses.manage"><ExpensesPage /></RequirePermission>,
          },
          {
            path: 'finance/refunds',
            element: <RequirePermission permission="finance.refunds.approve"><RefundsPage /></RequirePermission>,
          },
          {
            path: 'finance/work-sessions',
            element: <RequirePermission permission="finance.daily_closing.manage"><WorkSessionsPage /></RequirePermission>,
          },
          {
            path: 'finance/daily-closings',
            element: <RequirePermission permission="finance.daily_closing.manage"><DailyClosingPage /></RequirePermission>,
          },
          {
            path: 'creative/job-types',
            element: <RequirePermission permission="creative.jobs.view"><JobTypesPage /></RequirePermission>,
          },
          {
            path: 'creative/vendors',
            element: <RequirePermission permission="creative.vendors.manage"><VendorsPage /></RequirePermission>,
          },
          {
            path: 'creative/jobs',
            element: <RequirePermission permission="creative.jobs.view"><JobsPage /></RequirePermission>,
          },
          {
            path: 'creative/jobs/:id',
            element: <RequirePermission permission="creative.jobs.view"><JobDetailPage /></RequirePermission>,
          },
          {
            path: 'projects',
            element: withPermission('/projects', <ProjectsPage />),
          },
          {
            path: 'projects/types',
            element: <RequirePermission permission="projects.view"><ProjectTypesPage /></RequirePermission>,
          },
          {
            path: 'projects/:id',
            element: <RequirePermission permission="projects.view"><ProjectDetailPage /></RequirePermission>,
          },
          {
            path: 'projects/:id/summary',
            element: <RequirePermission permission="projects.view"><ProjectSummaryPage /></RequirePermission>,
          },
          {
            path: 'events',
            element: withPermission('/events', <EventsPage />),
          },
          {
            path: 'reports',
            element: withPermission('/reports', <ReportsPage />),
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'settings/profile',
            element: <SettingsProfilePage />,
          },
          {
            path: 'settings/users',
            element: withPermission('/settings/users', <SettingsUsersPage />),
          },
          {
            path: 'integrations/health',
            element: withPermission('/integrations/health', <IntegrationHealthPage />),
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <PublicOnlyRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <LoginPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: <RouteErrorPage />,
  },
]);
