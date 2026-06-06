import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { useTickerEvents } from '../../../modules/events/hooks/useTickerEvents';
import { TickerItem } from './TickerItem';

export function NotificationTicker() {
  const { t } = useTranslation('common');
  const { data, isError, isLoading } = useTickerEvents();
  const now = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    [],
  );
  const items = data?.items ?? [];

  return (
    <footer className="ticker-shell" aria-label={t('ticker.ariaLabel')}>
      <div className="ticker-icon-block">
        <Bell size={18} aria-hidden="true" />
        <span>Уведомления</span>
      </div>
      <div className="ticker-stream" aria-live="polite">
        {isLoading ? <span>{t('ticker.loading')}</span> : null}
        {isError ? <span>{t('ticker.unavailable')}</span> : null}
        {!isLoading && !isError && items.length === 0 ? <span>{t('ticker.empty')}</span> : null}
        {!isLoading && !isError ? items.slice(0, 4).map((event) => <TickerItem event={event} key={event.id} />) : null}
      </div>
      <div className="ticker-clock">
        <span>Сейчас</span>
        <time className="ticker-time">{now}</time>
      </div>
    </footer>
  );
}
