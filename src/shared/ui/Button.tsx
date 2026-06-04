import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
};

export function Button({ children, icon, variant = 'primary', isLoading = false, disabled, ...props }: ButtonProps) {
  return (
    <button className={`ui-button ${variant}`} disabled={disabled || isLoading} {...props}>
      {icon}
      <span>{isLoading ? 'Загрузка...' : children}</span>
    </button>
  );
}
