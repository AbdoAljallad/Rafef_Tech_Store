import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import { reportsApi, type ReportName } from '../../modules/reports/api/reports.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';

const reports: Array<{ key: ReportName; titleKey: string }> = [
  { key: 'sales', titleKey: 'reports.names.sales' },
  { key: 'inventory', titleKey: 'reports.names.inventory' },
  { key: 'finance', titleKey: 'reports.names.finance' },
  { key: 'repair', titleKey: 'reports.names.repair' },
  { key: 'projects', titleKey: 'reports.names.projects' },
  { key: 'creative', titleKey: 'reports.names.creative' },
];

function rows(report?: Record<string, string | number | null>) {
  return Object.entries(report ?? {}).map(([metric, value]) => ({ metric, value: value ?? 0 }));
}

export function ReportsPage() {
  const { t } = useTranslation('app');
  const queries = useQueries({
    queries: reports.map((report) => ({
      queryKey: ['report', report.key],
      queryFn: () => reportsApi.get(report.key),
    })),
  });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('reports.module')}</p>
          <h1>{t('reports.title')}</h1>
        </div>
        <Button icon={<BarChart3 size={18} />} onClick={() => queries.forEach((query) => query.refetch())}>
          {t('reports.refresh')}
        </Button>
      </header>

      <section className="widget-grid">
        {reports.map((report, index) => {
          const query = queries[index];
          const title = t(report.titleKey);

          return (
            <article className="panel" key={report.key}>
              <h2>{title}</h2>
              <DataTable
                rows={rows(query.data?.report)}
                isLoading={query.isLoading}
                emptyText={query.isError ? t('reports.loadFailed', { title }) : t('reports.noData')}
                getRowKey={(row) => row.metric}
                columns={[
                  { key: 'metric', header: t('reports.metric'), render: (row) => row.metric },
                  { key: 'value', header: t('reports.value'), render: (row) => String(row.value) },
                ]}
              />
            </article>
          );
        })}
      </section>
    </>
  );
}
