import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../../ui/IconButton';

type ModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <IconButton label="Закрыть" icon={<X size={18} />} onClick={onClose} />
        </header>
        {children}
      </section>
    </div>
  );
}
