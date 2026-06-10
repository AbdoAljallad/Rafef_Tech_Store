import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { useTickerEvents } from '../../../modules/events/hooks/useTickerEvents';
import { TickerItem } from './TickerItem';

export function NotificationTicker() {
  const { t, i18n } = useTranslation(['common', 'app']);
  const { data, isError, isLoading } = useTickerEvents();
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const now = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    [locale],
  );
  const items = data?.items ?? [];

  return (
    <footer className="ticker-shell" aria-label={t('common:ticker.ariaLabel')}>
      <Link className="ticker-icon-block" to="/events" aria-label={t('app:ticker.openEvents')}>
        <Bell size={18} aria-hidden="true" />
        <span>{t('app:ticker.notifications')}</span>
      </Link>
      <div className="ticker-stream" aria-live="polite">
        {isLoading ? <span>{t('common:ticker.loading')}</span> : null}
        {isError ? <span>{t('common:ticker.unavailable')}</span> : null}
        {!isLoading && !isError && items.length === 0 ? <span>{t('common:ticker.empty')}</span> : null}
        {!isLoading && !isError ? items.slice(0, 4).map((event) => <TickerItem event={event} key={event.id} />) : null}
      </div>
      <div className="ticker-clock">
        <span>{t('app:ticker.now')}</span>
        <time className="ticker-time">{now}</time>
      </div>
    </footer>
  );
}
