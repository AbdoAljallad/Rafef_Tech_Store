import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RadialMenu } from '../../modules/home/components/RadialMenu';
import { crmApi } from '../../modules/crm/api/crm.api';
import { reportsApi } from '../../modules/reports/api/reports.api';
import { salesApi } from '../../modules/sales/api/sales.api';

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

const CURRENCY_FORMATTER = new Intl.NumberFormat('ru-RU', {
  currency: 'EGP',
  maximumFractionDigits: 0,
  style: 'currency',
});

const NUMBER_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
});

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

function formatCount(value: number) {
  return NUMBER_FORMATTER.format(Math.max(0, Math.round(value)));
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

function getValueState(isLoading: boolean, isError: boolean, value: string) {
  if (isLoading) {
    return 'Загрузка';
  }

  return isError ? '—' : value;
}

function getTrendState(isLoading: boolean, isError: boolean, value: string) {
  if (isLoading) {
    return 'Получаем данные';
  }

  return isError ? 'Нет данных' : value;
}

export function HomePage() {
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
    const newCustomers = customers.filter((customer) => isToday(customer.created_at)).length;

    return [
      {
        label: 'Сегодняшние продажи',
        value: getValueState(salesQuery.isLoading, salesQuery.isError, CURRENCY_FORMATTER.format(todaySalesTotal)),
        trend: getTrendState(salesQuery.isLoading, salesQuery.isError, `${formatCount(todayInvoices.length)} чеков`),
        tone: 'sales',
        path: '/sales/pos',
        state: getWidgetState(salesQuery.isLoading, salesQuery.isError),
      },
      {
        label: 'Заказы на ремонт',
        value: getValueState(repairQuery.isLoading, repairQuery.isError, formatCount(activeRepairOrders)),
        trend: getTrendState(repairQuery.isLoading, repairQuery.isError, `${formatCount(repairInWork)} в работе`),
        tone: 'repair',
        path: '/repair/orders',
        state: getWidgetState(repairQuery.isLoading, repairQuery.isError),
      },
      {
        label: 'Товары на складе',
        value: getValueState(inventoryQuery.isLoading, inventoryQuery.isError, formatCount(products)),
        trend: getTrendState(inventoryQuery.isLoading, inventoryQuery.isError, `${formatCount(onHand)} ед. на складе`),
        tone: 'stock',
        path: '/inventory/stock',
        state: getWidgetState(inventoryQuery.isLoading, inventoryQuery.isError),
      },
      {
        label: 'Новые клиенты',
        value: getValueState(customersQuery.isLoading, customersQuery.isError, formatCount(newCustomers)),
        trend: getTrendState(customersQuery.isLoading, customersQuery.isError, `${formatCount(customers.length)} в списке`),
        tone: 'clients',
        path: '/customers',
        state: getWidgetState(customersQuery.isLoading, customersQuery.isError),
      },
    ];
  }, [customersQuery.data, customersQuery.isError, customersQuery.isLoading, inventoryQuery.data, inventoryQuery.isError, inventoryQuery.isLoading, repairQuery.data, repairQuery.isError, repairQuery.isLoading, salesQuery.data, salesQuery.isError, salesQuery.isLoading]);

  return (
    <div className="home-workspace">
      <div className="home-tech-grid" aria-hidden="true" />
      <div className="home-particle-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <RadialMenu />
      <aside className="home-widget-stack" aria-label="Ключевые показатели">
        {widgets.map((widget) => (
          <Link className={`home-widget-zone ${widget.tone} ${widget.state ?? ''}`} key={widget.label} to={widget.path}>
            <div className="home-widget-heading">
              <span className="home-widget-kicker">Показатель</span>
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
