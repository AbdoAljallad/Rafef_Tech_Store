import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function AccessDenied() {
  const { t } = useTranslation('common');

  return (
    <section className="panel narrow">
      <h1>{t('accessDenied.title')}</h1>
      <p className="muted">{t('accessDenied.text')}</p>
      <Link to="/home">{t('actions.backHome')}</Link>
    </section>
  );
}
