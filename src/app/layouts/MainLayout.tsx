import { Link, Outlet, useLocation } from 'react-router-dom';
import { ModuleNav } from '../../shared/components/Navigation/ModuleNav';
import { NotificationTicker } from '../../shared/components/NotificationTicker/NotificationTicker';
import { UserCard } from '../../shared/components/Sidebar/UserCard';
import { SkipLink } from '../../shared/components/SkipLink/SkipLink';
import { DevModeBadge } from '../../shared/components/DevModeBadge/DevModeBadge';
import { SystemControls } from '../../shared/components/SystemControls/SystemControls';
import { logos } from '../../shared/assets/logos';

export function MainLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/home' || location.pathname === '/';

  return (
    <div className={isHomePage ? 'app-shell home-shell' : 'app-shell'}>
      <SkipLink />
      <DevModeBadge />
      <div className={isHomePage ? 'app-body home' : 'app-body'}>
        <aside className="left-panel" aria-label="Панель пользователя">
          {!isHomePage ? (
            <Link to="/home" className="sidebar-brand" aria-label="На главный экран Rafef Tech">
              <span className="sidebar-brand-mark">
                <img src={logos.rafefTech} alt="" />
              </span>
              <span>
                <strong>Rafef Tech</strong>
                <small>Система управления</small>
              </span>
            </Link>
          ) : null}
          <UserCard isHomePage={isHomePage} />
          {!isHomePage ? <ModuleNav /> : null}
        </aside>
        <main className={isHomePage ? 'app-content home-content' : 'app-content'} id="main-content" tabIndex={-1}>
          <div className="content-utility-row">
            <SystemControls />
          </div>
          <Outlet />
        </main>
      </div>
      <NotificationTicker />
    </div>
  );
}
