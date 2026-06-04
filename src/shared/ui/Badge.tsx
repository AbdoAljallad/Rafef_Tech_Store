import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`ui-badge ${tone}`}>{children}</span>;
}
