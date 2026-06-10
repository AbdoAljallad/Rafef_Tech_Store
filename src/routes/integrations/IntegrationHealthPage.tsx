import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { integrationsApi } from '../../modules/integrations/api/integrations.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Badge } from '../../shared/ui/Badge';

function formatIntegrationStatus(status: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`integrations.statuses.${status}`, { ns: 'app', defaultValue: status });
}

export function IntegrationHealthPage() {
  const { t } = useTranslation('app');
  const healthQuery = useQuery({ queryKey: ['integrationsHealth'], queryFn: integrationsApi.health });
  const outboxQuery = useQuery({ queryKey: ['webhookOutbox'], queryFn: integrationsApi.outbox });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('integrations.module')}</p>
          <h1>{t('integrations.title')}</h1>
        </div>
      </header>

      <section className="detail-grid">
        <article className="panel">
          <h2>{t('integrations.servicesTitle')}</h2>
          <DataTable
            rows={healthQuery.data?.health.services ?? []}
            isLoading={healthQuery.isLoading}
            emptyText={healthQuery.isError ? t('integrations.servicesLoadFailed') : t('integrations.noServices')}
            getRowKey={(row) => row.key ?? row.name}
            columns={[
              { key: 'service', header: t('integrations.service'), render: (row) => row.key ?? row.name },
              {
                key: 'status',
                header: t('integrations.status'),
                render: (row) => (
                  <Badge tone={row.status === 'ok' || row.status === 'configured' ? 'success' : 'warning'}>
                    {formatIntegrationStatus(row.status, t)}
                  </Badge>
                ),
              },
            ]}
          />
        </article>

        <article className="panel">
          <h2>{t('integrations.outboxTitle')}</h2>
          <DataTable
            rows={outboxQuery.data?.items ?? []}
            isLoading={outboxQuery.isLoading}
            emptyText={outboxQuery.isError ? t('integrations.outboxLoadFailed') : t('integrations.noOutbox')}
            getRowKey={(row) => row.id}
            columns={[
              { key: 'target', header: t('integrations.target'), render: (row) => row.target },
              { key: 'event', header: t('integrations.event'), render: (row) => row.event_type },
              { key: 'status', header: t('integrations.status'), render: (row) => formatIntegrationStatus(row.status, t) },
            ]}
          />
        </article>
      </section>
    </>
  );
}
