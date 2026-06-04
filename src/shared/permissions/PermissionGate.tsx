import type { ReactNode } from 'react';
import { usePermission } from './usePermission';

type PermissionGateProps = {
  permission?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const isAllowed = usePermission(permission);

  if (!isAllowed) {
    return fallback;
  }

  return <>{children}</>;
}
