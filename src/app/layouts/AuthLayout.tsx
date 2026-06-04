import { Outlet } from 'react-router-dom';
import { DevModeBadge } from '../../shared/components/DevModeBadge/DevModeBadge';

export function AuthLayout() {
  return (
    <main className="auth-page">
      <DevModeBadge />
      <Outlet />
    </main>
  );
}
