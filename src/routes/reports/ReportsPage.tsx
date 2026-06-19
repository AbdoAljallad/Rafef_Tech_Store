import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Coins,
  FolderKanban,
  Palette,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  reportsApi,
  type DetailedReportPayload,
  type ReportFilters,
  type ReportMetricValue,
  type ReportName,
  type ReportTableRow,
} from '../../modules/reports/api/reports.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { AccessDenied } from '../../shared/components/AccessDenied/AccessDenied';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Tabs, type TabItem } from '../../shared/ui/Tabs';

type TabKey = 'overview' | ReportName;
type SummaryCard = {
  key: string;
  icon: ReactElement;
  label: string;
  value: string;
  hint?: string;
};

const sectionMeta: Record<ReportName, { icon: ReactElement; path: string }> = {
  sales: { icon: <ReceiptText size={18} />, path: '/sales/invoices' },
  inventory: { icon: <Boxes size={18} />, path: '/inventory/stock' },
  finance: { icon: <Coins size={18} />, path: '/finance/transactions' },
  repair: { icon: <Wrench size={18} />, path: '/repair/orders/list' },
  projects: { icon: <FolderKanban size={18} />, path: '/projects' },
  creative: { icon: <Palette size={18} />, path: '/creative/jobs' },
  customers: { icon: <Users size={18} />, path: '/customers' },
  profit: { icon: <TrendingUp size={18} />, path: '/sales/invoices' },
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildPresetRange(preset: 'last7' | 'last30' | 'thisMonth' | 'all'): ReportFilters {
  const now = new Date();

  if (preset === 'all') {
    return { dateFrom: null, dateTo: null };
  }

  if (preset === 'thisMonth') {
    return {
      dateFrom: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      dateTo: formatDateInput(now),
    };
  }

  const days = preset === 'last7' ? 6 : 29;
  const start = new Date(now);
  start.setDate(now.getDate() - days);

  return {
    dateFrom: formatDateInput(start),
    dateTo: formatDateInput(now),
  };
}

function toNumber(value: ReportMetricValue | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: ReportMetricValue | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}

function resolveLocale(language?: string) {
  return language?.startsWith('ar') ? 'ar-EG' : 'ru-RU';
}

function resolveCompactLocale(language?: string) {
  return language?.startsWith('ar') ? 'ar' : 'ru';
}

function humanizeToken(token: string) {
  return token
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMetricValue(metric: string, value: ReportMetricValue | undefined, locale: string) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const numericValue = Number(value);
  const percentageMetrics = new Set(['margin_percent']);
  const moneyMetrics = new Set([
    'total',
    'subtotal',
    'incoming',
    'outgoing',
    'expenses',
    'refunds',
    'net',
    'average_ticket',
    'estimated_profit',
    'estimated_cost',
    'stock_cost_value',
    'stock_sale_value',
    'revenue',
    'billed_total',
    'repair_revenue',
    'project_revenue',
    'direct_sales_revenue',
  ]);

  if (Number.isFinite(numericValue)) {
    if (percentageMetrics.has(metric)) {
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(numericValue)}%`;
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: moneyMetrics.has(metric) ? 2 : 0,
      maximumFractionDigits: moneyMetrics.has(metric) ? 2 : 2,
    }).format(numericValue);
  }

  return String(value);
}

function formatDateTime(value: ReportMetricValue | undefined, locale: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDateOnly(value: ReportMetricValue | undefined, locale: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(locale, {
    dateStyle: 'medium',
  });
}

function getRows(payload: DetailedReportPayload | undefined, key: string) {
  const value = payload?.[key];
  return Array.isArray(value) ? (value as ReportTableRow[]) : [];
}

function getReport(payload: DetailedReportPayload | undefined) {
  return payload?.report ?? {};
}

function MetricCards({
  locale,
  report,
  t,
  keys,
}: {
  locale: string;
  report: Record<string, ReportMetricValue>;
  t: (key: string, options?: Record<string, unknown>) => string;
  keys: string[];
}) {
  return (
    <div className="reports-metric-grid">
      {keys.map((metric) => (
        <div className="metric-card" key={metric}>
          <span>{t(`reports.metrics.${metric}`, { defaultValue: humanizeToken(metric) })}</span>
          <strong>{formatMetricValue(metric, report[metric], locale)}</strong>
        </div>
      ))}
    </div>
  );
}

function BarList({
  rows,
  labelKey,
  valueKey,
  locale,
  t,
  emptyText,
}: {
  rows: ReportTableRow[];
  labelKey: string;
  valueKey: string;
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  emptyText: string;
}) {
  const maxValue = rows.reduce((max, row) => Math.max(max, toNumber(row[valueKey])), 0);

  if (!rows.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="reports-bar-list">
      {rows.map((row, index) => {
        const value = toNumber(row[valueKey]);
        const ratio = maxValue > 0 ? Math.max(6, (value / maxValue) * 100) : 0;
        let label = row[labelKey] ? toText(row[labelKey]) : t(`reports.statuses.${toText(row.status)}`, { defaultValue: humanizeToken(toText(row.status)) });

        if (labelKey === 'status') {
          label = t(`reports.statuses.${label}`, { defaultValue: humanizeToken(label) });
        }

        if (labelKey === 'movement_type') {
          label = t(`reports.movementTypes.${label}`, { defaultValue: humanizeToken(label) });
        }

        if (labelKey === 'line_type') {
          label = t(`reports.lineTypes.${label}`, { defaultValue: humanizeToken(label) });
        }

        if (labelKey === 'operation_type') {
          label = t(`finance.operationTypes.${label}`, { defaultValue: humanizeToken(label) });
        }

        return (
          <div className="reports-bar-item" key={`${label}-${index}`}>
            <div className="reports-bar-copy">
              <span>{label}</span>
              <strong>{formatMetricValue(valueKey, row[valueKey], locale)}</strong>
            </div>
            <div className="reports-bar-track">
              <span style={{ width: `${ratio}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionShell({
  title,
  description,
  actionPath,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  actionPath: string;
  actionLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="panel reports-section-shell">
      <div className="reports-section-head">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        <Link className="tech-action reports-inline-action" to={actionPath}>
          {actionLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

export function ReportsPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const locale = resolveLocale(i18n.resolvedLanguage);
  const compactLocale = resolveCompactLocale(i18n.resolvedLanguage);
  const [filters, setFilters] = useState<ReportFilters>(() => buildPresetRange('last30'));
  const [activePreset, setActivePreset] = useState<'last7' | 'last30' | 'thisMonth' | 'all' | 'custom'>('last30');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const dashboardQuery = useQuery({
    queryKey: ['reports-dashboard', filters.dateFrom ?? 'all', filters.dateTo ?? 'all'],
    queryFn: () => reportsApi.getDashboard(filters),
  });

  const availableSections = dashboardQuery.data?.availableSections ?? [];

  useEffect(() => {
    if (activeTab === 'overview') {
      return;
    }

    if (!availableSections.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, availableSections]);

  const tabs = useMemo<TabItem[]>(() => {
    const items: TabItem[] = [{ key: 'overview', label: t('reports.tabs.overview') }];
    return items.concat(
      availableSections.map((key) => ({
        key,
        label: t(`reports.names.${key}`),
      })),
    );
  }, [availableSections, t]);

  const sections = dashboardQuery.data?.sections ?? {};
  const sales = sections.sales;
  const inventory = sections.inventory;
  const finance = sections.finance;
  const repair = sections.repair;
  const projects = sections.projects;
  const creative = sections.creative;
  const customers = sections.customers;
  const profit = sections.profit;

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const cards: SummaryCard[] = [];

    if (sales) {
      cards.push({
        key: 'documents',
        icon: <ReceiptText size={20} />,
        label: t('reports.summary.documents'),
        value: formatMetricValue('invoices', getReport(sales).invoices, locale),
        hint: t('reports.summary.documentsHint'),
      });
    }

    if (inventory) {
      cards.push({
        key: 'stockUnits',
        icon: <Boxes size={20} />,
        label: t('reports.summary.stockUnits'),
        value: formatMetricValue('on_hand', getReport(inventory).on_hand, locale),
        hint: t('reports.summary.stockUnitsHint'),
      });
    }

    if (finance) {
      cards.push({
        key: 'netFlow',
        icon: <Coins size={20} />,
        label: t('reports.summary.netFlow'),
        value: formatMetricValue('net', getReport(finance).net, locale),
        hint: t('reports.summary.netFlowHint'),
      });
    }

    const activeWork = toNumber(getReport(repair).active) + toNumber(getReport(projects).active) + toNumber(getReport(creative).active);
    cards.push({
      key: 'activeWork',
      icon: <BriefcaseBusiness size={20} />,
      label: t('reports.summary.activeWork'),
      value: formatMetricValue('active', activeWork, locale),
      hint: t('reports.summary.activeWorkHint'),
    });

    if (profit) {
      cards.push({
        key: 'profit',
        icon: <TrendingUp size={20} />,
        label: t('reports.summary.estimatedProfit'),
        value: formatMetricValue('estimated_profit', getReport(profit).estimated_profit, locale),
        hint: t('reports.summary.estimatedProfitHint'),
      });
    }

    return cards;
  }, [creative, finance, inventory, locale, profit, projects, repair, sales, t]);

  const watchlist = useMemo(() => {
    const items: Array<{ key: string; title: string; text: string; section?: ReportName }> = [];
    const lowStock = getRows(inventory, 'lowStock');
    const ageingQueue = getRows(repair, 'ageingQueue');
    const deadlineRisk = getRows(projects, 'deadlineRisk');
    const creativeReport = getReport(creative);

    if (lowStock.length) {
      items.push({
        key: 'low-stock',
        title: t('reports.watchlist.lowStockTitle'),
        text: t('reports.watchlist.lowStockText', { count: lowStock.length }),
        section: 'inventory',
      });
    }

    if (ageingQueue.length) {
      items.push({
        key: 'repair-queue',
        title: t('reports.watchlist.repairQueueTitle'),
        text: t('reports.watchlist.repairQueueText', { count: ageingQueue.length }),
        section: 'repair',
      });
    }

    if (deadlineRisk.length) {
      items.push({
        key: 'project-risk',
        title: t('reports.watchlist.projectRiskTitle'),
        text: t('reports.watchlist.projectRiskText', { count: deadlineRisk.length }),
        section: 'projects',
      });
    }

    if (toNumber(creativeReport.overdue) > 0) {
      items.push({
        key: 'creative-overdue',
        title: t('reports.watchlist.creativeOverdueTitle'),
        text: t('reports.watchlist.creativeOverdueText', { count: toNumber(creativeReport.overdue) }),
        section: 'creative',
      });
    }

    return items;
  }, [creative, inventory, projects, repair, t]);

  const sectionSnapshots = useMemo(() => {
    return availableSections.map((section) => {
      const payload = sections[section];
      const report = getReport(payload);
      const meta = sectionMeta[section];

      const highlights: string[] = [];

      if (section === 'sales') {
        highlights.push(`${t('reports.metrics.total')}: ${formatMetricValue('total', report.total, locale)}`);
        highlights.push(`${t('reports.metrics.average_ticket')}: ${formatMetricValue('average_ticket', report.average_ticket, locale)}`);
      } else if (section === 'inventory') {
        highlights.push(`${t('reports.metrics.available')}: ${formatMetricValue('available', report.available, locale)}`);
        highlights.push(`${t('reports.metrics.low_stock')}: ${formatMetricValue('low_stock', report.low_stock, locale)}`);
      } else if (section === 'finance') {
        highlights.push(`${t('reports.metrics.incoming')}: ${formatMetricValue('incoming', report.incoming, locale)}`);
        highlights.push(`${t('reports.metrics.expenses')}: ${formatMetricValue('expenses', report.expenses, locale)}`);
      } else if (section === 'repair') {
        highlights.push(`${t('reports.metrics.active')}: ${formatMetricValue('active', report.active, locale)}`);
        highlights.push(`${t('reports.metrics.waiting')}: ${formatMetricValue('waiting', report.waiting, locale)}`);
      } else if (section === 'projects') {
        highlights.push(`${t('reports.metrics.in_progress')}: ${formatMetricValue('in_progress', report.in_progress, locale)}`);
        highlights.push(`${t('reports.metrics.on_hold')}: ${formatMetricValue('on_hold', report.on_hold, locale)}`);
      } else if (section === 'creative') {
        highlights.push(`${t('reports.metrics.active')}: ${formatMetricValue('active', report.active, locale)}`);
        highlights.push(`${t('reports.metrics.overdue')}: ${formatMetricValue('overdue', report.overdue, locale)}`);
      } else if (section === 'customers') {
        highlights.push(`${t('reports.metrics.active_buyers')}: ${formatMetricValue('active_buyers', report.active_buyers, locale)}`);
        highlights.push(`${t('reports.metrics.billed_total')}: ${formatMetricValue('billed_total', report.billed_total, locale)}`);
      } else if (section === 'profit') {
        highlights.push(`${t('reports.metrics.margin_percent')}: ${formatMetricValue('margin_percent', report.margin_percent, locale)}`);
        highlights.push(`${t('reports.metrics.revenue')}: ${formatMetricValue('revenue', report.revenue, locale)}`);
      }

      return {
        key: section,
        title: t(`reports.names.${section}`),
        path: meta.path,
        icon: meta.icon,
        highlights,
      };
    });
  }, [availableSections, locale, sections, t]);

  function applyPreset(preset: 'last7' | 'last30' | 'thisMonth' | 'all') {
    setActivePreset(preset);
    setFilters(buildPresetRange(preset));
  }

  function setCustomDate(key: 'dateFrom' | 'dateTo', value: string) {
    setActivePreset('custom');
    setFilters((current) => ({
      ...current,
      [key]: value || null,
    }));
  }

  function rangeLabel() {
    if (!filters.dateFrom && !filters.dateTo) {
      return t('reports.range.allTime');
    }

    if (filters.dateFrom && filters.dateTo) {
      return `${formatDateOnly(filters.dateFrom, locale)} - ${formatDateOnly(filters.dateTo, locale)}`;
    }

    if (filters.dateFrom) {
      return t('reports.range.fromDate', { date: formatDateOnly(filters.dateFrom, locale) });
    }

    return t('reports.range.toDate', { date: formatDateOnly(filters.dateTo, locale) });
  }

  function renderOverview() {
    return (
      <div className="reports-tab-stack">
        <section className="ops-summary-grid">
          {summaryCards.map((card) => (
            <article className="panel ops-summary-card" key={card.key}>
              {card.icon}
              <strong>{card.value}</strong>
              <span>{card.label}</span>
              {card.hint ? <small className="muted">{card.hint}</small> : null}
            </article>
          ))}
        </section>

        <div className="reports-overview-grid">
          <article className="panel reports-watchlist-panel">
            <div className="reports-section-head">
              <div>
                <h2>{t('reports.watchlist.title')}</h2>
                <p className="muted">{t('reports.watchlist.description')}</p>
              </div>
              <Badge tone="info">{watchlist.length.toLocaleString(compactLocale)}</Badge>
            </div>

            {watchlist.length ? (
              <div className="reports-watchlist">
                {watchlist.map((item) => (
                  <button className="reports-watch-item" key={item.key} type="button" onClick={() => item.section ? setActiveTab(item.section) : undefined}>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">{t('reports.watchlist.clear')}</div>
            )}
          </article>

          <article className="panel reports-snapshot-panel">
            <div className="reports-section-head">
              <div>
                <h2>{t('reports.snapshot.title')}</h2>
                <p className="muted">{t('reports.snapshot.description')}</p>
              </div>
              <Badge tone="success">{availableSections.length.toLocaleString(compactLocale)}</Badge>
            </div>

            <div className="reports-snapshot-grid">
              {sectionSnapshots.map((snapshot) => (
                <div className="reports-snapshot-card" key={snapshot.key}>
                  <div className="reports-snapshot-head">
                    <div className="reports-snapshot-icon">{snapshot.icon}</div>
                    <strong>{snapshot.title}</strong>
                  </div>
                  <div className="reports-snapshot-copy">
                    {snapshot.highlights.map((highlight) => (
                      <span key={highlight}>{highlight}</span>
                    ))}
                  </div>
                  <div className="reports-snapshot-actions">
                    <button className="tech-action" type="button" onClick={() => setActiveTab(snapshot.key)}>
                      {t('reports.actions.openTab')}
                    </button>
                    <Link className="tech-action" to={snapshot.path}>
                      {t('reports.actions.openModule')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    );
  }

  function renderSales(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.sales')}
        description={t('reports.moduleHint', { title: t('reports.names.sales') })}
        actionPath={sectionMeta.sales.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['invoices', 'quotes', 'total', 'average_ticket', 'estimated_profit', 'customers']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.topProducts')}</h3>
            <BarList rows={getRows(payload, 'topProducts')} labelKey="product_name" valueKey="revenue" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.topCustomers')}</h3>
            <BarList rows={getRows(payload, 'topCustomers')} labelKey="customer_name" valueKey="revenue" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
        </div>
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.statusBreakdown')}</h3>
            <BarList rows={getRows(payload, 'statusBreakdown')} labelKey="status" valueKey="documents" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.recentDocuments')}</h3>
            <DataTable
              rows={getRows(payload, 'recentDocuments')}
              getRowKey={(row) => `${row.id}`}
              columns={[
                {
                  key: 'invoice_code',
                  header: t('reports.columns.document'),
                  render: (row) => (
                    <div>
                      <strong>{toText(row.invoice_code)}</strong>
                      <div className="muted">{formatDateTime(row.created_at, locale)}</div>
                    </div>
                  ),
                },
                {
                  key: 'customer',
                  header: t('reports.columns.customer'),
                  render: (row) => toText(row.customer_name),
                },
                {
                  key: 'status',
                  header: t('reports.columns.status'),
                  render: (row) => (
                    <Badge tone={toText(row.status) === 'approved' ? 'success' : 'neutral'}>
                      {t(`reports.statuses.${toText(row.status)}`, { defaultValue: humanizeToken(toText(row.status)) })}
                    </Badge>
                  ),
                },
                {
                  key: 'total',
                  header: t('reports.columns.total'),
                  render: (row) => formatMetricValue('total', row.total, locale),
                },
              ]}
            />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderInventory(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.inventory')}
        description={t('reports.inventorySnapshotHint')}
        actionPath={sectionMeta.inventory.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['products', 'on_hand', 'reserved', 'available', 'low_stock', 'movements']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.lowStock')}</h3>
            <DataTable
              rows={getRows(payload, 'lowStock')}
              getRowKey={(row) => `${row.product_id}`}
              columns={[
                { key: 'name', header: t('reports.columns.product'), render: (row) => `${toText(row.product_name)} (${toText(row.sku)})` },
                { key: 'on_hand', header: t('reports.columns.onHand'), render: (row) => formatMetricValue('on_hand', row.quantity_on_hand, locale) },
                { key: 'threshold', header: t('reports.columns.threshold'), render: (row) => formatMetricValue('reorder_threshold', row.reorder_threshold, locale) },
              ]}
            />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.recentMovements')}</h3>
            <DataTable
              rows={getRows(payload, 'recentMovements')}
              getRowKey={(row) => `${row.id}`}
              columns={[
                {
                  key: 'product',
                  header: t('reports.columns.product'),
                  render: (row) => `${toText(row.product_name)} (${toText(row.sku)})`,
                },
                {
                  key: 'movement_type',
                  header: t('reports.columns.type'),
                  render: (row) => t(`reports.movementTypes.${toText(row.movement_type)}`, { defaultValue: humanizeToken(toText(row.movement_type)) }),
                },
                { key: 'quantity', header: t('reports.columns.quantity'), render: (row) => formatMetricValue('quantity', row.quantity, locale) },
                { key: 'created_at', header: t('reports.columns.date'), render: (row) => formatDateTime(row.created_at, locale) },
              ]}
            />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderFinance(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.finance')}
        description={t('reports.moduleHint', { title: t('reports.names.finance') })}
        actionPath={sectionMeta.finance.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['incoming', 'outgoing', 'expenses', 'refunds', 'net', 'transactions']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.byOperation')}</h3>
            <BarList rows={getRows(payload, 'byOperation')} labelKey="operation_type" valueKey="transactions" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.recentTransactions')}</h3>
            <DataTable
              rows={getRows(payload, 'recentTransactions')}
              getRowKey={(row) => `${row.id}`}
              columns={[
                {
                  key: 'code',
                  header: t('reports.columns.transaction'),
                  render: (row) => (
                    <div>
                      <strong>{toText(row.transaction_code)}</strong>
                      <div className="muted">{formatDateTime(row.created_at, locale)}</div>
                    </div>
                  ),
                },
                { key: 'account', header: t('reports.columns.account'), render: (row) => toText(row.account_name) },
                { key: 'operation', header: t('reports.columns.operation'), render: (row) => t(`finance.operationTypes.${toText(row.operation_type)}`, { defaultValue: humanizeToken(toText(row.operation_type)) }) },
                {
                  key: 'amount',
                  header: t('reports.columns.amount'),
                  render: (row) => (
                    <Badge tone={toText(row.direction) === 'in' ? 'success' : 'warning'}>
                      {formatMetricValue('total', row.amount, locale)}
                    </Badge>
                  ),
                },
              ]}
            />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderRepair(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.repair')}
        description={t('reports.moduleHint', { title: t('reports.names.repair') })}
        actionPath={sectionMeta.repair.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['orders', 'active', 'in_repair', 'waiting', 'delivered', 'cancelled']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.statusBreakdown')}</h3>
            <BarList rows={getRows(payload, 'statusBreakdown')} labelKey="status" valueKey="orders" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.ageingQueue')}</h3>
            <DataTable
              rows={getRows(payload, 'ageingQueue')}
              getRowKey={(row) => `${row.id}`}
              columns={[
                { key: 'order', header: t('reports.columns.order'), render: (row) => toText(row.order_code) },
                { key: 'customer', header: t('reports.columns.customer'), render: (row) => toText(row.customer_name) },
                { key: 'device', header: t('reports.columns.device'), render: (row) => toText(row.device_name) },
                { key: 'age', header: t('reports.columns.ageDays'), render: (row) => formatMetricValue('age_days', row.age_days, locale) },
              ]}
            />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderProjects(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.projects')}
        description={t('reports.moduleHint', { title: t('reports.names.projects') })}
        actionPath={sectionMeta.projects.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['projects', 'active', 'in_progress', 'on_hold', 'completed']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.statusBreakdown')}</h3>
            <BarList rows={getRows(payload, 'statusBreakdown')} labelKey="status" valueKey="projects" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.deadlineRisk')}</h3>
            <DataTable
              rows={getRows(payload, 'deadlineRisk')}
              getRowKey={(row) => `${row.id}`}
              columns={[
                { key: 'project', header: t('reports.columns.project'), render: (row) => toText(row.title) },
                { key: 'customer', header: t('reports.columns.customer'), render: (row) => toText(row.customer_name) },
                { key: 'deadline', header: t('reports.columns.deadline'), render: (row) => formatDateTime(row.planned_end_at, locale) },
                { key: 'days', header: t('reports.columns.daysToDeadline'), render: (row) => formatMetricValue('days_to_deadline', row.days_to_deadline, locale) },
              ]}
            />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderCreative(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.creative')}
        description={t('reports.moduleHint', { title: t('reports.names.creative') })}
        actionPath={sectionMeta.creative.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['jobs', 'draft', 'active', 'completed', 'overdue']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.statusBreakdown')}</h3>
            <BarList rows={getRows(payload, 'statusBreakdown')} labelKey="status" valueKey="jobs" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.vendorQueue')}</h3>
            <BarList rows={getRows(payload, 'vendorQueue')} labelKey="vendor_name" valueKey="active_tasks" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderCustomers(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.customers')}
        description={t('reports.moduleHint', { title: t('reports.names.customers') })}
        actionPath={sectionMeta.customers.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['customers', 'business', 'person', 'active_buyers', 'billed_total']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.topCustomers')}</h3>
            <BarList rows={getRows(payload, 'topCustomers')} labelKey="customer_name" valueKey="revenue" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.recentCustomers')}</h3>
            <DataTable
              rows={getRows(payload, 'recentCustomers')}
              getRowKey={(row) => `${row.customer_id}`}
              columns={[
                { key: 'name', header: t('reports.columns.customer'), render: (row) => toText(row.customer_name) },
                { key: 'code', header: t('reports.columns.code'), render: (row) => toText(row.customer_code) },
                { key: 'type', header: t('reports.columns.type'), render: (row) => t(`reports.customerTypes.${toText(row.customer_type)}`, { defaultValue: humanizeToken(toText(row.customer_type)) }) },
                { key: 'date', header: t('reports.columns.date'), render: (row) => formatDateTime(row.created_at, locale) },
              ]}
            />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderProfit(payload: DetailedReportPayload) {
    const report = getReport(payload);

    return (
      <SectionShell
        title={t('reports.names.profit')}
        description={t('reports.profitHint')}
        actionPath={sectionMeta.profit.path}
        actionLabel={t('reports.actions.openModule')}
      >
        <MetricCards locale={locale} report={report} t={t} keys={['revenue', 'estimated_cost', 'estimated_profit', 'margin_percent', 'repair_revenue', 'project_revenue']} />
        <div className="reports-section-grid">
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.byLineType')}</h3>
            <BarList rows={getRows(payload, 'byLineType')} labelKey="line_type" valueKey="estimated_profit" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
          <article className="panel reports-subpanel">
            <h3>{t('reports.tables.topProfitableProducts')}</h3>
            <BarList rows={getRows(payload, 'topProducts')} labelKey="product_name" valueKey="estimated_profit" locale={locale} t={t} emptyText={t('reports.noData')} />
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderTab() {
    if (activeTab === 'overview') {
      return renderOverview();
    }

    const payload = sections[activeTab];
    if (!payload) {
      return <div className="empty-state">{t('reports.noData')}</div>;
    }

    switch (activeTab) {
      case 'sales':
        return renderSales(payload);
      case 'inventory':
        return renderInventory(payload);
      case 'finance':
        return renderFinance(payload);
      case 'repair':
        return renderRepair(payload);
      case 'projects':
        return renderProjects(payload);
      case 'creative':
        return renderCreative(payload);
      case 'customers':
        return renderCustomers(payload);
      case 'profit':
        return renderProfit(payload);
      default:
        return <div className="empty-state">{t('reports.noData')}</div>;
    }
  }

  if (dashboardQuery.isError) {
    return (
      <div className="ops-dashboard">
        <header className="page-header">
          <div>
            <p className="eyebrow">{t('reports.module')}</p>
            <h1>{t('reports.title')}</h1>
          </div>
        </header>
        <ErrorState title={t('reports.loadFailed', { title: t('reports.title') })} description={t('reports.retryHint')} />
      </div>
    );
  }

  if (!dashboardQuery.isLoading && availableSections.length === 0) {
    return (
      <main className="page-shell centered">
        <AccessDenied />
      </main>
    );
  }

  return (
    <div className="ops-dashboard reports-dashboard-v2">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('reports.module')}</p>
          <h1>{t('reports.title')}</h1>
          <p className="muted reports-hero-copy">{t('reports.description')}</p>
        </div>

        <div className="reports-header-actions">
          <Badge tone="info">
            <CalendarDays size={14} />
            {rangeLabel()}
          </Badge>
          <Button icon={<RefreshCw size={18} />} onClick={() => dashboardQuery.refetch()}>
            {t('reports.refresh')}
          </Button>
        </div>
      </header>

      <section className="panel reports-filter-panel">
        <div className="reports-filter-copy">
          <h2>{t('reports.filtersTitle')}</h2>
          <p className="muted">{t('reports.filtersText')}</p>
          <div className="reports-generated-at">
            {t('reports.generatedAt')}: {dashboardQuery.data ? formatDateTime(dashboardQuery.data.generatedAt, locale) : t('loading', { ns: 'common' })}
          </div>
        </div>

        <div className="reports-filter-controls">
          <div className="reports-preset-row">
            {(['last7', 'last30', 'thisMonth', 'all'] as const).map((preset) => (
              <button
                className={preset === activePreset ? 'reports-preset active' : 'reports-preset'}
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
              >
                {t(`reports.presets.${preset}`)}
              </button>
            ))}
          </div>

          <div className="reports-date-grid">
            <Input
              label={t('reports.dateFrom')}
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(event) => setCustomDate('dateFrom', event.target.value)}
            />
            <Input
              label={t('reports.dateTo')}
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(event) => setCustomDate('dateTo', event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel reports-tabs-panel">
        <Tabs items={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as TabKey)} />
      </section>

      {dashboardQuery.isLoading ? <div className="table-state">{t('loading', { ns: 'common' })}</div> : renderTab()}
    </div>
  );
}
