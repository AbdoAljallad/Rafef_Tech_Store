import i18n from '../../../shared/localization/i18n';
import { isApiError } from '../../../shared/api/apiErrors';

export function inventoryErrorMessage(error: unknown) {
  if (!isApiError(error)) {
    return i18n.t('inventory.errors.generic', { ns: 'app' });
  }

  if (error.code === 'INSUFFICIENT_STOCK') {
    return i18n.t('inventory.errors.insufficientStock', { ns: 'app' });
  }

  if (error.code === 'STATE_CONFLICT') {
    return i18n.t('inventory.errors.stateConflict', { ns: 'app' });
  }

  if (error.code === 'NOT_FOUND') {
    return i18n.t('inventory.errors.notFound', { ns: 'app' });
  }

  if (error.code === 'VALIDATION_ERROR') {
    return i18n.t('inventory.errors.validation', { ns: 'app' });
  }

  if (error.status === 403) {
    return i18n.t('inventory.errors.permissionDenied', { ns: 'app' });
  }

  return error.message || i18n.t('inventory.errors.generic', { ns: 'app' });
}
