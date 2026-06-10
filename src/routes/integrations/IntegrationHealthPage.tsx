import { useQuery } from '@tanstack/react-query';
import { integrationsApi } from '../../modules/integrations/api/integrations.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Badge } from '../../shared/ui/Badge';

export function IntegrationHealthPage() {
  const healthQuery = useQuery({ queryKey: ['integrationsHealth'], queryFn: integrationsApi.health });
  const outboxQuery = useQuery({ queryKey: ['webhookOutbox'], queryFn: integrationsApi.outbox });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Интеграции</p>
          <h1>Состояние интеграций</h1>
        </div>
      </header>

      <section className="detail-grid">
        <article className="panel">
          <h2>Состояние сервисов</h2>
          <DataTable
            rows={healthQuery.data?.health.services ?? []}
            isLoading={healthQuery.isLoading}
            emptyText={healthQuery.isError ? 'Не удалось загрузить состояние интеграций' : 'Сервисы не найдены'}
            getRowKey={(row) => row.key ?? row.name}
            columns={[
              { key: 'service', header: 'Сервис', render: (row) => row.key ?? row.name },
              { key: 'status', header: 'Статус', render: (row) => <Badge tone={row.status === 'ok' || row.status === 'configured' ? 'success' : 'warning'}>{row.status}</Badge> },
            ]}
          />
        </article>

        <article className="panel">
          <h2>Очередь webhook</h2>
          <DataTable
            rows={outboxQuery.data?.items ?? []}
            isLoading={outboxQuery.isLoading}
            emptyText={outboxQuery.isError ? 'Не удалось загрузить очередь webhook' : 'Задания webhook отсутствуют'}
            getRowKey={(row) => row.id}
            columns={[
              { key: 'target', header: 'Цель', render: (row) => row.target },
              { key: 'event', header: 'Событие', render: (row) => row.event_type },
              { key: 'status', header: 'Статус', render: (row) => row.status },
            ]}
          />
        </article>
      </section>
    </>
  );
}
