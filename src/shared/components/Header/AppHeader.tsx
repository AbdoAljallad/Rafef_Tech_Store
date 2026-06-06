import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logos } from '../../assets/logos';

type AppHeaderProps = {
  isHomePage?: boolean;
};

export function AppHeader({ isHomePage = false }: AppHeaderProps) {
  const { t } = useTranslation('modules');
  const commandCenterLabel = t('navigation.commandCenter');

  return (
    <header className={isHomePage ? 'app-header home-header' : 'app-header'}>
      <Link to="/home" className="brand-link">
        <span className="brand-mark image">
          <img src={logos.rafefTech} alt="" />
        </span>
        <span>Rafef Tech</span>
      </Link>
      <div className="header-status-group">
        <span className="header-title">{commandCenterLabel}</span>
        {isHomePage ? (
          <span className="header-system-status">
            <span className="header-status-dot" aria-hidden="true" />
            <span>Система активна</span>
          </span>
        ) : null}
      </div>
    </header>
  );
}
