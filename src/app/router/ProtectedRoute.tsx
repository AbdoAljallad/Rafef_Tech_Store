import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import { LoadingScreen } from '../../shared/components/LoadingScreen/LoadingScreen';

export function ProtectedRoute() {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  if (status === 'unknown') {
    return <LoadingScreen />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
