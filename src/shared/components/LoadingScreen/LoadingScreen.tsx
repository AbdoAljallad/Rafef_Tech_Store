import { useTranslation } from 'react-i18next';

export function LoadingScreen() {
  const { t } = useTranslation('common');

  return (
    <main className="page-shell centered">
      <section className="panel narrow">
        <p className="muted">{t('loading')}</p>
      </section>
    </main>
  );
}
