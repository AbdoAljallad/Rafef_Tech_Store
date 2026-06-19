import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

const AUTH_REQUIRED_EVENT = 'rafef:auth-required';

export function AuthSessionSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleAuthRequired = () => {
      useAuthStore.getState().markUnauthenticated();
      void queryClient.clear();
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);

    return () => {
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, [queryClient]);

  return null;
}
