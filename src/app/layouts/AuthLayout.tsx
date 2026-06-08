import { Outlet } from 'react-router-dom';
import { DevModeBadge } from '../../shared/components/DevModeBadge/DevModeBadge';
import { SystemControls } from '../../shared/components/SystemControls/SystemControls';

export function AuthLayout() {
  return (
    <main className="auth-page">
      <DevModeBadge />
      <SystemControls />
      <div className="auth-tech-grid" aria-hidden="true" />
      <div className="auth-glow-field" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
      <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
      <div className="auth-particle-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <Outlet />
    </main>
  );
}
