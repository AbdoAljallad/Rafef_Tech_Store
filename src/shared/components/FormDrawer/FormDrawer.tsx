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
      <aside className="form-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-header">
          <div>
            <span className="tech-pill drawer-section-label">CRM</span>
            <h2>{title}</h2>
          </div>
          <IconButton label="Закрыть" icon={<X size={18} />} onClick={onClose} />
        </header>
        {children}
      </aside>
    </div>
  );
}
