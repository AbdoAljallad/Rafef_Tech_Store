import { useTranslation } from 'react-i18next';
import { useTickerEvents } from '../../modules/events/hooks/useTickerEvents';
import { DataTable } from '../../shared/components/DataTable/DataTable';

export function EventsPage() {
  const { t } = useTranslation('app');
  const events = useTickerEvents();

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('events.module')}</p>
          <h1>{t('events.title')}</h1>
        </div>
      </header>

      <section className="panel entity-summary">
        <h2>{t('events.summaryTitle')}</h2>
        <p className="muted">{t('events.summaryText')}</p>
      </section>

      <DataTable
        rows={events.data?.items ?? []}
        isLoading={events.isLoading}
        emptyText={events.isError ? t('events.unavailable') : t('events.empty')}
        getRowKey={(event) => event.id}
        columns={[
          { key: 'title', header: t('events.event'), render: (event) => event.messageRu },
          { key: 'module', header: t('events.moduleLabel'), render: (event) => event.module },
          { key: 'created', header: t('events.time'), render: (event) => event.createdAt },
        ]}
      />
    </>
  );
}
