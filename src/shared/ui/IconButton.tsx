import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Tooltip } from './Tooltip';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
};

export function IconButton({ label, icon, ...props }: IconButtonProps) {
  return (
    <Tooltip label={label}>
      <button className="icon-button" type="button" aria-label={label} {...props}>
        {icon}
      </button>
    </Tooltip>
  );
}
