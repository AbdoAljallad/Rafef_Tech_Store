import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';

export function RouteErrorPage() {
  const { t } = useTranslation('common');
  const error = useRouteError();
  const title = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : t('errors.routeErrorTitle');

  return (
    <main className="page-shell centered">
      <section className="panel narrow">
        <ErrorState title={title} description={t('errors.routeErrorText')} />
        <Link to="/home">{t('actions.backHome')}</Link>
      </section>
    </main>
  );
}
