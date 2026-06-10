import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';
import { Modal } from '../Modal/Modal';

type ConfirmDialogProps = {
  title: string;
  message: string;
  isOpen: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  isOpen,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');

  return (
    <Modal title={title} isOpen={isOpen} onClose={onCancel}>
      <div className="confirm-dialog">
        <p>{message}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel || t('actions.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel || t('actions.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
