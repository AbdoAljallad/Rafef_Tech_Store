import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import '../../shared/localization/i18n';
import { SystemPreferencesBootstrap } from '../../shared/components/SystemPreferences/SystemPreferencesBootstrap';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SystemPreferencesBootstrap />
      {children}
    </QueryClientProvider>
  );
}
