import { RouterProvider } from 'react-router-dom';
import { AppErrorBoundary } from './errors/AppErrorBoundary';
import { AppProviders } from './providers/AppProviders';
import { router } from './router';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  );
}
