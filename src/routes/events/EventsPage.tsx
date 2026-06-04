import { useTickerEvents } from '../../modules/events/hooks/useTickerEvents';
import { DataTable } from '../../shared/components/DataTable/DataTable';

export function EventsPage() {
  const events = useTickerEvents();
  return <>
    <header className="page-header"><div><p className="eyebrow">События</p><h1>Лента событий</h1></div></header>
    <section className="panel entity-summary">
      <h2>Интеграции и уведомления</h2>
      <p className="muted">Здесь отображаются системные события и состояние внешних доставок.</p>
    </section>
    <DataTable rows={events.data?.items ?? []} isLoading={events.isLoading} emptyText={events.isError ? 'Лента событий временно недоступна' : 'Событий пока нет'} getRowKey={(e) => e.id} columns={[
      { key: 'title', header: 'Событие', render: (e) => e.messageRu },
      { key: 'module', header: 'Модуль', render: (e) => e.module },
      { key: 'created', header: 'Время', render: (e) => e.createdAt },
    ]} />
  </>;
}
