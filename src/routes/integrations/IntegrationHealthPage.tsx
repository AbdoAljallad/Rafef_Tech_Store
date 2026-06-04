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
          <p className="eyebrow">Integrations</p>
          <h1>Integration Health</h1>
        </div>
      </header>

      <section className="detail-grid">
        <article className="panel">
          <h2>Service Status</h2>
          <DataTable
            rows={healthQuery.data?.health.services ?? []}
            isLoading={healthQuery.isLoading}
            emptyText={healthQuery.isError ? 'Failed to load integration health' : 'No services'}
            getRowKey={(row) => row.key ?? row.name}
            columns={[
              { key: 'service', header: 'Service', render: (row) => row.key ?? row.name },
              { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'ok' || row.status === 'configured' ? 'success' : 'warning'}>{row.status}</Badge> },
            ]}
          />
        </article>

        <article className="panel">
          <h2>Webhook Outbox</h2>
          <DataTable
            rows={outboxQuery.data?.items ?? []}
            isLoading={outboxQuery.isLoading}
            emptyText={outboxQuery.isError ? 'Failed to load webhook outbox' : 'No webhook jobs'}
            getRowKey={(row) => row.id}
            columns={[
              { key: 'target', header: 'Target', render: (row) => row.target },
              { key: 'event', header: 'Event', render: (row) => row.event_type },
              { key: 'status', header: 'Status', render: (row) => row.status },
            ]}
          />
        </article>
      </section>
    </>
  );
}
