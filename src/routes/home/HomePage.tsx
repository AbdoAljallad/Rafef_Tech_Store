import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RadialMenu } from '../../modules/home/components/RadialMenu';
import { crmApi } from '../../modules/crm/api/crm.api';
import { reportsApi } from '../../modules/reports/api/reports.api';
import { salesApi } from '../../modules/sales/api/sales.api';
import { UserCard } from '../../shared/components/Sidebar/UserCard';

type WidgetTone = 'sales' | 'repair' | 'stock' | 'clients';
type WidgetState = 'loading' | 'error';

type HomeWidget = {
  label: string;
  value: string;
  trend: string;
  tone: WidgetTone;
  path: string;
  state?: WidgetState;
};

type ReportPayload = Record<string, string | number | null | undefined>;

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isToday(value: unknown) {
  if (!value) {
    return false;
  }

  const date = new Date(String(value));
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getReportNumber(report: ReportPayload | undefined, key: string) {
  return toNumber(report?.[key]);
}

function getWidgetState(isLoading: boolean, isError: boolean): WidgetState | undefined {
  if (isLoading) {
    return 'loading';
  }

  return isError ? 'error' : undefined;
}

export function HomePage() {
  const { t, i18n } = useTranslation('app');
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        currency: 'EGP',
        maximumFractionDigits: 0,
        style: 'currency',
      }),
    [locale],
  );
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  function formatCount(value: number) {
    return numberFormatter.format(Math.max(0, Math.round(value)));
  }

  function getValueState(isLoading: boolean, isError: boolean, value: string) {
    if (isLoading) {
      return t('home.loading');
    }

    return isError ? '—' : value;
  }

  function getTrendState(isLoading: boolean, isError: boolean, value: string) {
    if (isLoading) {
      return t('home.receivingData');
    }

    return isError ? t('home.noData') : value;
  }

  const salesQuery = useQuery({
    queryKey: ['home', 'sales-today'],
    queryFn: () => salesApi.listInvoices({ offset: 0, limit: 100 }),
  });

  const repairQuery = useQuery({
    queryKey: ['home', 'repair-report'],
    queryFn: () => reportsApi.get('repair'),
  });

  const inventoryQuery = useQuery({
    queryKey: ['home', 'inventory-report'],
    queryFn: () => reportsApi.get('inventory'),
  });

  const customersQuery = useQuery({
    queryKey: ['home', 'customers-recent'],
    queryFn: () => crmApi.listCustomers(undefined, { pageSize: 100 }),
  });

  const widgets = useMemo<HomeWidget[]>(() => {
    const invoices = salesQuery.data?.items ?? [];
    const todayInvoices = invoices.filter((invoice) => isToday(invoice.created_at) && invoice.status !== 'voided');
    const todaySalesTotal = todayInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

    const repairReport = repairQuery.data?.report;
    const repairOrders = getReportNumber(repairReport, 'orders');
    const repairDelivered = getReportNumber(repairReport, 'delivered');
    const repairCancelled = getReportNumber(repairReport, 'cancelled');
    const repairInWork = getReportNumber(repairReport, 'in_repair');
    const activeRepairOrders = repairOrders - repairDelivered - repairCancelled;

    const inventoryReport = inventoryQuery.data?.report;
    const products = getReportNumber(inventoryReport, 'products');
    const onHand = getReportNumber(inventoryReport, 'on_hand');

    const customers = customersQuery.data?.items ?? [];
    const customersTotal = toNumber(customersQuery.data?.meta?.total);
    const newCustomers = customers.filter((customer) => isToday(customer.created_at)).length;

    return [
      {
        label: t('home.widgets.sales'),
        value: getValueState(salesQuery.isLoading, salesQuery.isError, currencyFormatter.format(todaySalesTotal)),
        trend: getTrendState(salesQuery.isLoading, salesQuery.isError, t('home.trend.checks', { count: formatCount(todayInvoices.length) })),
        tone: 'sales',
        path: '/sales/pos',
        state: getWidgetState(salesQuery.isLoading, salesQuery.isError),
      },
      {
        label: t('home.widgets.repair'),
        value: getValueState(repairQuery.isLoading, repairQuery.isError, formatCount(activeRepairOrders)),
        trend: getTrendState(repairQuery.isLoading, repairQuery.isError, t('home.trend.inWork', { count: formatCount(repairInWork) })),
        tone: 'repair',
        path: '/repair/orders',
        state: getWidgetState(repairQuery.isLoading, repairQuery.isError),
      },
      {
        label: t('home.widgets.stock'),
        value: getValueState(inventoryQuery.isLoading, inventoryQuery.isError, formatCount(products)),
        trend: getTrendState(inventoryQuery.isLoading, inventoryQuery.isError, t('home.trend.onHand', { count: formatCount(onHand) })),
        tone: 'stock',
        path: '/inventory/stock',
        state: getWidgetState(inventoryQuery.isLoading, inventoryQuery.isError),
      },
      {
        label: t('home.widgets.customers'),
        value: getValueState(customersQuery.isLoading, customersQuery.isError, formatCount(newCustomers)),
        trend: getTrendState(customersQuery.isLoading, customersQuery.isError, t('home.trend.inList', { count: formatCount(customersTotal) })),
        tone: 'clients',
        path: '/customers',
        state: getWidgetState(customersQuery.isLoading, customersQuery.isError),
      },
    ];
  }, [
    currencyFormatter,
    customersQuery.data,
    customersQuery.isError,
    customersQuery.isLoading,
    inventoryQuery.data,
    inventoryQuery.isError,
    inventoryQuery.isLoading,
    numberFormatter,
    repairQuery.data,
    repairQuery.isError,
    repairQuery.isLoading,
    salesQuery.data,
    salesQuery.isError,
    salesQuery.isLoading,
    t,
  ]);

  return (
    <div className="home-workspace">
      <div className="home-tech-grid" aria-hidden="true" />
      <div className="home-particle-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="home-profile-panel">
        <UserCard isHomePage />
      </div>
      <RadialMenu />
      <aside className="home-widget-stack" aria-label={t('home.keyIndicators')}>
        {widgets.map((widget) => (
          <Link className={`home-widget-zone ${widget.tone} ${widget.state ?? ''}`} key={widget.label} to={widget.path}>
            <div className="home-widget-heading">
              <span className="home-widget-kicker">{t('home.metric')}</span>
              <span className="home-widget-trend">{widget.trend}</span>
            </div>
            <div>
              <h2>{widget.label}</h2>
              <p>{widget.value}</p>
            </div>
            <div className="home-widget-sparkline" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </Link>
        ))}
      </aside>
    </div>
  );
}
