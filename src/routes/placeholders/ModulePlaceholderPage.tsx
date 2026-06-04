import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MODULE_PLACEHOLDERS } from './modulePlaceholderConfig';

type ModulePlaceholderPageProps = {
  moduleKey: string;
};

export function ModulePlaceholderPage({ moduleKey }: ModulePlaceholderPageProps) {
  const { t } = useTranslation(['modules', 'common']);
  const config = MODULE_PLACEHOLDERS[moduleKey];
  const titleKey = config?.titleKey ?? `navigation.${moduleKey}`;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('common:placeholder.phaseOne')}</p>
          <h1>{t(`modules:${titleKey}`)}</h1>
        </div>
        <Link to="/home">{t('common:actions.backHome')}</Link>
      </header>

      <section className="module-placeholder panel" aria-labelledby={`${moduleKey}-placeholder-title`}>
        <div>
          <h2 id={`${moduleKey}-placeholder-title`}>{t('common:placeholder.moduleNotImplemented')}</h2>
          <p className="muted">
            {config ? t(`modules:${config.descriptionKey}`) : t('common:placeholder.readyForNextPhase')}
          </p>
        </div>

        {config ? (
          <ul className="placeholder-list">
            {config.plannedItemKeys.map((itemKey) => (
              <li key={itemKey}>{t(`modules:placeholderItems.${itemKey}`)}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </>
  );
}
