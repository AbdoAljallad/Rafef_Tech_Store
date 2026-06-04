import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import { LoadingScreen } from '../../shared/components/LoadingScreen/LoadingScreen';

export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  if (status === 'unknown') {
    return <LoadingScreen />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
