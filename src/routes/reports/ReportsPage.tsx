import { useQueries } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { reportsApi, type ReportName } from '../../modules/reports/api/reports.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';

const reports: Array<{ key: ReportName; title: string; permission: string }> = [
  { key: 'sales', title: 'Продажи', permission: 'reports.sales.view' },
  { key: 'inventory', title: 'Склад', permission: 'reports.inventory.view' },
  { key: 'finance', title: 'Финансы', permission: 'reports.finance.view' },
  { key: 'repair', title: 'Ремонт', permission: 'reports.repair.view' },
  { key: 'projects', title: 'Проекты', permission: 'reports.projects.view' },
  { key: 'creative', title: 'Креатив', permission: 'reports.creative.view' }
];

function rows(report?: Record<string, string | number | null>) {
  return Object.entries(report ?? {}).map(([metric, value]) => ({ metric, value: value ?? 0 }));
}

export function ReportsPage() {
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
          <p className="eyebrow">Отчёты</p>
          <h1>Отчёты</h1>
        </div>
        <Button icon={<BarChart3 size={18} />} onClick={() => queries.forEach((query) => query.refetch())}>Обновить</Button>
      </header>

      <section className="widget-grid">
        {reports.map((report, index) => {
          const query = queries[index];
          return (
            <article className="panel" key={report.key}>
              <h2>{report.title}</h2>
              <DataTable
                rows={rows(query.data?.report)}
                isLoading={query.isLoading}
                emptyText={query.isError ? `Не удалось загрузить отчёт: ${report.title}` : 'Данные отчёта отсутствуют'}
                getRowKey={(row) => row.metric}
                columns={[
                  { key: 'metric', header: 'Показатель', render: (row) => row.metric },
                  { key: 'value', header: 'Значение', render: (row) => String(row.value) },
                ]}
              />
            </article>
          );
        })}
      </section>
    </>
  );
}
