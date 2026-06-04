import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logos } from '../../../shared/assets/logos';

export function CenterLogoButton() {
  const { t } = useTranslation('modules');

  return (
    <Link className="center-circle" to="/command-center" aria-label={t('navigation.commandCenter')}>
      <img className="center-circle-logo" src={logos.rafefTech} alt="" />
      <span className="center-circle-title">Rafef Tech</span>
      <small>{t('navigation.commandCenter')}</small>
    </Link>
  );
}
