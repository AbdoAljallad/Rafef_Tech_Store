import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '../../shared/components/Header/AppHeader';
import { ModuleNav } from '../../shared/components/Navigation/ModuleNav';
import { NotificationTicker } from '../../shared/components/NotificationTicker/NotificationTicker';
import { UserCard } from '../../shared/components/Sidebar/UserCard';
import { SkipLink } from '../../shared/components/SkipLink/SkipLink';
import { DevModeBadge } from '../../shared/components/DevModeBadge/DevModeBadge';

export function MainLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/home' || location.pathname === '/';

  return (
    <div className="app-shell">
      <SkipLink />
      <DevModeBadge />
      <AppHeader />
      <div className={isHomePage ? 'app-body home' : 'app-body'}>
        <aside className="left-panel" aria-label="Панель пользователя">
          <UserCard />
          {!isHomePage ? <ModuleNav /> : null}
        </aside>
        <main className={isHomePage ? 'app-content home-content' : 'app-content'} id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <NotificationTicker />
    </div>
  );
}
