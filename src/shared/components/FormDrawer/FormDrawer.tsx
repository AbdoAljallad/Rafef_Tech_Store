import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../../ui/IconButton';

type FormDrawerProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function FormDrawer({ title, isOpen, onClose, children }: FormDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="drawer-backdrop" role="presentation">
      <aside className="form-drawer" aria-label={title}>
        <header className="drawer-header">
          <h2>{title}</h2>
          <IconButton label="Закрыть" icon={<X size={18} />} onClick={onClose} />
        </header>
        {children}
      </aside>
    </div>
  );
}
