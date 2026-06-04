import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error boundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page-shell centered">
          <ErrorState title="Ошибка интерфейса" description="Обновите страницу или вернитесь на главный экран." />
        </main>
      );
    }

    return this.props.children;
  }
}
