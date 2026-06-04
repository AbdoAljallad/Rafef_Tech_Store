import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logos } from '../../assets/logos';

export function AppHeader() {
  const { t } = useTranslation('modules');

  return (
    <header className="app-header">
      <Link to="/home" className="brand-link">
        <span className="brand-mark image">
          <img src={logos.rafefTech} alt="" />
        </span>
        <span>Rafef Tech</span>
      </Link>
      <span className="header-title">{t('navigation.commandCenter')}</span>
    </header>
  );
}
