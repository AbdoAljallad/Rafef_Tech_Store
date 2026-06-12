import { useQueries } from '@tanstack/react-query';
import { BarChart3, Boxes, BriefcaseBusiness, Coins, ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { reportsApi, type ReportName } from '../../modules/reports/api/reports.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { Button } from '../../shared/ui/Button';

const reports: Array<{ key: ReportName; titleKey: string }> = [
  { key: 'sales', titleKey: 'reports.names.sales' },
  { key: 'inventory', titleKey: 'reports.names.inventory' },
  { key: 'finance', titleKey: 'reports.names.finance' },
  { key: 'repair', titleKey: 'reports.names.repair' },
  { key: 'projects', titleKey: 'reports.names.projects' },
  { key: 'creative', titleKey: 'reports.names.creative' },
];

const monetaryMetrics = new Set(['total', 'subtotal', 'incoming', 'outgoing', 'expenses', 'refunds', 'net']);

function resolveLocale(language?: string) {
  return language?.startsWith('ar') ? 'ar' : 'ru';
}

function humanizeMetric(metric: string) {
  return metric
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMetricValue(metric: string, value: string | number | null, locale: string) {
  if (value === null || value === undefined) {
    return '0';
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numericValue)) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: monetaryMetrics.has(metric) ? 2 : 0,
      maximumFractionDigits: monetaryMetrics.has(metric) ? 2 : 2,
    }).format(numericValue);
  }

  return String(value);
}

export function ReportsPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const locale = resolveLocale(i18n.resolvedLanguage);
  const queries = useQueries({
    queries: reports.map((report) => ({
      queryKey: ['report', report.key],
      queryFn: () => reportsApi.get(report.key),
    })),
  });

  const salesReport = queries[0]?.data?.report ?? {};
  const inventoryReport = queries[1]?.data?.report ?? {};
  const financeReport = queries[2]?.data?.report ?? {};
  const repairReport = queries[3]?.data?.report ?? {};
  const projectsReport = queries[4]?.data?.report ?? {};
  const creativeReport = queries[5]?.data?.report ?? {};
  const loadedModules = queries.filter((query) => query.isSuccess).length;
  const activeWork = Number(repairReport.in_repair ?? 0) + Number(projectsReport.in_progress ?? 0) + Number(creativeReport.active ?? 0);

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('reports.module')}</p>
          <h1>{t('reports.title')}</h1>
        </div>
        <Button icon={<BarChart3 size={18} />} onClick={() => queries.forEach((query) => query.refetch())}>
          {t('reports.refresh')}
        </Button>
      </header>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <ReceiptText size={20} />
          <strong>{formatMetricValue('invoices', salesReport.invoices ?? 0, locale)}</strong>
          <span>{t('reports.summary.documents')}</span>
        </article>
        <article className="panel ops-summary-card">
          <Boxes size={20} />
          <strong>{formatMetricValue('on_hand', inventoryReport.on_hand ?? 0, locale)}</strong>
          <span>{t('reports.summary.stockUnits')}</span>
        </article>
        <article className="panel ops-summary-card">
          <Coins size={20} />
          <strong>{formatMetricValue('net', financeReport.net ?? 0, locale)}</strong>
          <span>{t('reports.summary.netFlow')}</span>
        </article>
        <article className="panel ops-summary-card">
          <BriefcaseBusiness size={20} />
          <strong>{formatMetricValue('active', activeWork, locale)}</strong>
          <span>{t('reports.summary.activeWork')}</span>
        </article>
        <article className="panel ops-summary-card">
          <BarChart3 size={20} />
          <strong>{loadedModules}/{reports.length}</strong>
          <span>{t('reports.summary.modulesReady')}</span>
        </article>
      </section>

      <section className="widget-grid ops-report-grid">
        {reports.map((report, index) => {
          const query = queries[index];
          const title = t(report.titleKey);
          const entries = Object.entries(query.data?.report ?? {});

          return (
            <article className="panel ops-panel" key={report.key}>
              <div className="ops-panel-header">
                <div className="entity-toolbar-copy">
                  <h2>{title}</h2>
                  <p className="muted">{t('reports.moduleHint', { title })}</p>
                </div>
              </div>

              {query.isLoading ? <div className="table-state">{t('loading', { ns: 'common' })}</div> : null}
              {query.isError ? <ErrorState title={t('reports.loadFailed', { title })} description={t('reports.retryHint')} /> : null}
              {!query.isLoading && !query.isError && entries.length === 0 ? <div className="empty-state">{t('reports.noData')}</div> : null}

              {!query.isLoading && !query.isError && entries.length > 0 ? (
                <div className="metric-grid">
                  {entries.map(([metric, value]) => (
                    <div className="metric-card" key={metric}>
                      <span>{t(`reports.metrics.${metric}`, { defaultValue: humanizeMetric(metric) })}</span>
                      <strong>{formatMetricValue(metric, value, locale)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
