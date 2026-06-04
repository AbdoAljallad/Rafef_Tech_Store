import { isApiError } from '../../../shared/api/apiErrors';

export function inventoryErrorMessage(error: unknown) {
  if (!isApiError(error)) {
    return 'Не удалось выполнить операцию. Проверьте соединение и попробуйте снова.';
  }

  if (error.code === 'INSUFFICIENT_STOCK') {
    return 'Недостаточно доступного остатка для операции.';
  }

  if (error.code === 'STATE_CONFLICT') {
    return 'Операция невозможна для текущего состояния записи.';
  }

  if (error.code === 'NOT_FOUND') {
    return 'Запись не найдена.';
  }

  if (error.code === 'VALIDATION_ERROR') {
    return 'Проверьте заполнение формы.';
  }

  if (error.status === 403) {
    return 'Недостаточно прав для операции.';
  }

  return error.message || 'Не удалось выполнить операцию.';
}
