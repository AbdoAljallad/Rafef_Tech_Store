import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation('common');

  return (
    <main className="page-shell centered">
      <section className="panel narrow">
        <h1>{t('errors.notFoundTitle')}</h1>
        <p className="muted">{t('errors.notFoundText')}</p>
        <Link to="/home">{t('actions.backHome')}</Link>
      </section>
    </main>
  );
}
