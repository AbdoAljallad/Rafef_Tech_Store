import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../../ui/IconButton';

type FormDrawerProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function FormDrawer({ title, isOpen, onClose, children }: FormDrawerProps) {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleBackdropClick() {
    onClose();
  }

  function handlePanelClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return createPortal(
    <>
      <style>{`
        @keyframes formDrawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes formDrawerScaleIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .form-drawer-centered-backdrop {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          animation: formDrawerFadeIn 0.2s ease;
        }

        .form-drawer-centered-scrim {
          position: absolute;
          inset: 0;
          border: 0;
          background: transparent;
          padding: 0;
        }

        .form-drawer-centered-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          z-index: 91;
          display: grid;
          width: min(90vw, 600px);
          max-height: 85vh;
          overflow-y: auto;
          grid-template-rows: auto minmax(0, 1fr);
          border: 1px solid var(--theme-action-border);
          border-radius: 24px;
          background:
            linear-gradient(145deg, var(--theme-panel-fill-start), var(--theme-panel-fill-end)),
            radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent-soft) 14%, transparent), transparent 34%);
          box-shadow: var(--shadow-panel, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
          transform: translate(-50%, -50%);
          animation: formDrawerScaleIn 0.2s ease;
        }

        .form-drawer-centered-panel .drawer-header {
          position: sticky;
          top: 0;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.1rem 1.25rem;
          border-bottom: 1px solid var(--theme-action-border);
          background: color-mix(in srgb, var(--color-surface) 88%, transparent);
          backdrop-filter: blur(10px);
        }

        .form-drawer-centered-panel .drawer-header h2 {
          margin: 0.2rem 0 0;
        }

        .form-drawer-centered-panel > :not(.drawer-header) {
          padding: 1.15rem 1.25rem 1.25rem;
        }

        @media (max-width: 640px) {
          .form-drawer-centered-panel {
            width: min(94vw, 600px);
            max-height: 88vh;
          }

          .form-drawer-centered-panel .drawer-header,
          .form-drawer-centered-panel > :not(.drawer-header) {
            padding-inline: 1rem;
          }
        }
      `}</style>
      <div className="form-drawer-centered-backdrop" role="presentation">
        <button className="form-drawer-centered-scrim" type="button" aria-label={t('actions.close')} onClick={handleBackdropClick} />
        <aside
          className="form-drawer form-drawer-centered-panel"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={handlePanelClick}
        >
          <header className="drawer-header">
            <div>
              <h2>{title}</h2>
            </div>
            <IconButton label={t('actions.close')} icon={<X size={18} />} onClick={onClose} />
          </header>
          {children}
        </aside>
      </div>
    </>,
    document.body,
  );
}
