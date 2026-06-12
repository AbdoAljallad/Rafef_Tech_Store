import { CircleAlert, ExternalLink, ShieldAlert, Siren, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTickerEvents } from '../../modules/events/hooks/useTickerEvents';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Select } from '../../shared/ui/Select';

function resolveLocale(language?: string) {
  return language?.startsWith('ar') ? 'ar' : 'ru';
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function severityTone(severity: 'normal' | 'important' | 'urgent' | 'critical') {
  if (severity === 'critical') {
    return 'danger' as const;
  }

  if (severity === 'urgent') {
    return 'warning' as const;
  }

  if (severity === 'important') {
    return 'info' as const;
  }

  return 'neutral' as const;
}

export function EventsPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const eventsQuery = useTickerEvents();
  const navigate = useNavigate();
  const locale = resolveLocale(i18n.resolvedLanguage);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const events = eventsQuery.data?.items ?? [];
  const modules = Array.from(new Set(events.map((event) => event.module))).sort((left, right) => left.localeCompare(right, locale));
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      search.trim().length === 0 ||
      event.messageRu.toLowerCase().includes(search.trim().toLowerCase()) ||
      event.module.toLowerCase().includes(search.trim().toLowerCase());
    const matchesModule = moduleFilter === 'all' || event.module === moduleFilter;
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    return matchesSearch && matchesModule && matchesSeverity;
  });
  const criticalCount = events.filter((event) => event.severity === 'critical').length;
  const urgentCount = events.filter((event) => event.severity === 'urgent').length;
  const linkableCount = events.filter((event) => event.linkPath && event.linkPath !== '/events').length;

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('events.module')}</p>
          <h1>{t('events.title')}</h1>
        </div>
      </header>

      <section className="panel ops-hero">
        <div className="ops-hero-copy">
          <h2>{t('events.summaryTitle')}</h2>
          <p className="muted">{t('events.summaryText')}</p>
        </div>
        <div className="ops-inline-pills">
          <Badge tone="info">{t('events.liveFeed')}</Badge>
          <Badge tone="neutral">{t('events.lastItems', { total: events.length })}</Badge>
        </div>
      </section>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <Sparkles size={20} />
          <strong>{events.length}</strong>
          <span>{t('events.stats.total')}</span>
        </article>
        <article className="panel ops-summary-card">
          <ShieldAlert size={20} />
          <strong>{criticalCount}</strong>
          <span>{t('events.stats.critical')}</span>
        </article>
        <article className="panel ops-summary-card">
          <Siren size={20} />
          <strong>{urgentCount}</strong>
          <span>{t('events.stats.urgent')}</span>
        </article>
        <article className="panel ops-summary-card">
          <ExternalLink size={20} />
          <strong>{linkableCount}</strong>
          <span>{t('events.stats.actions')}</span>
        </article>
      </section>

      <section className="panel ops-panel">
        <div className="ops-panel-header">
          <div className="entity-toolbar-copy">
            <h2>{t('events.feedTitle')}</h2>
            <p className="muted">{t('events.feedDescription')}</p>
          </div>
        </div>

        <div className="ops-filter-grid">
          <div className="ops-filter-search">
            <span>{t('events.filters.search')}</span>
            <SearchInput
              aria-label={t('events.filters.search')}
              placeholder={t('events.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select label={t('events.filters.module')} value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
            <option value="all">{t('events.filters.allModules')}</option>
            {modules.map((module) => (
              <option key={module} value={module}>
                {t(`modules.${module}`, { defaultValue: module })}
              </option>
            ))}
          </Select>
          <Select label={t('events.filters.severity')} value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="all">{t('events.filters.allSeverities')}</option>
            <option value="normal">{t('events.severityLabels.normal')}</option>
            <option value="important">{t('events.severityLabels.important')}</option>
            <option value="urgent">{t('events.severityLabels.urgent')}</option>
            <option value="critical">{t('events.severityLabels.critical')}</option>
          </Select>
        </div>

        {eventsQuery.isError ? <ErrorState title={t('events.unavailable')} description={t('events.tryAgainLater')} /> : null}

        {eventsQuery.isLoading ? <div className="table-state">{t('loading', { ns: 'common' })}</div> : null}

        {!eventsQuery.isLoading && filteredEvents.length === 0 ? (
          <div className="empty-state">
            <CircleAlert size={18} />
            <div>
              <strong>{search || moduleFilter !== 'all' || severityFilter !== 'all' ? t('events.noFiltered') : t('events.empty')}</strong>
              <p className="muted">{t('events.noFilteredHint')}</p>
            </div>
          </div>
        ) : null}

        {!eventsQuery.isLoading && filteredEvents.length > 0 ? (
          <div className="event-feed">
            {filteredEvents.map((event) => (
              <article className="event-card" key={event.id}>
                <div className="event-card-top">
                  <div className="detail-stack">
                    <strong>{event.messageRu}</strong>
                    <span className="muted">{formatDateTime(event.createdAt, locale)}</span>
                  </div>
                  <Badge tone={severityTone(event.severity)}>{t(`events.severityLabels.${event.severity}`)}</Badge>
                </div>
                <div className="event-meta">
                  <span>{t('events.moduleLabel')}: {t(`modules.${event.module}`, { defaultValue: event.module })}</span>
                  <span>{t('events.time')}: {formatDateTime(event.createdAt, locale)}</span>
                </div>
                <div className="event-card-actions">
                  {event.linkPath && event.linkPath !== '/events' ? (
                    <Button variant="secondary" icon={<ExternalLink size={16} />} onClick={() => navigate(event.linkPath ?? '/events')}>
                      {t('events.open')}
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
