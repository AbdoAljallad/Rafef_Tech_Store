import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WidgetArea } from '../../modules/command-center/components/WidgetArea';

export function CommandCenterPage() {
  const { t } = useTranslation(['modules', 'common']);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Rafef Tech</p>
          <h1>{t('modules:navigation.commandCenter')}</h1>
        </div>
        <Link to="/home">{t('common:actions.backHome')}</Link>
      </header>

      <WidgetArea />
    </>
  );
}
