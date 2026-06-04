import type { ReactNode } from 'react';
import { AccessDenied } from '../components/AccessDenied/AccessDenied';
import { usePermission } from './usePermission';

type RequirePermissionProps = {
  permission?: string;
  children: ReactNode;
};

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const isAllowed = usePermission(permission);

  if (!isAllowed) {
    return (
      <main className="page-shell centered">
        <AccessDenied />
      </main>
    );
  }

  return <>{children}</>;
}
