import type { TFunction } from 'i18next';
import { isApiError } from '../../../shared/api/apiErrors';
import type { SalesDocumentType, SalesInvoiceStatus } from '../types/sales.types';

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSalesLocale(language?: string) {
  return language === 'ar' ? 'ar-EG' : 'ru-RU';
}

export function formatSalesMoney(value: number | string | null | undefined, language?: string) {
  return new Intl.NumberFormat(getSalesLocale(language), {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatSalesDate(value: string | null | undefined, language?: string) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(getSalesLocale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getSalesDocumentLabel(t: TFunction<'app'>, type: SalesDocumentType) {
  return t(`sales.documentTypes.${type}`);
}

export function getSalesStatusLabel(t: TFunction<'app'>, status: SalesInvoiceStatus) {
  return t(`sales.statuses.${status}`);
}

export function getSalesErrorMessage(error: unknown, t: TFunction<'app'>) {
  if (!isApiError(error)) {
    return t('sales.errors.generic');
  }

  if (error.code === 'NETWORK_ERROR') {
    return t('sales.errors.network');
  }

  if (error.code === 'NOT_FOUND') {
    return t('sales.errors.notFound');
  }

  if (error.code === 'STATE_CONFLICT') {
    return t('sales.errors.stateConflict');
  }

  if (error.code === 'INSUFFICIENT_STOCK') {
    return t('sales.errors.insufficientStock');
  }

  if (error.code === 'VALIDATION_ERROR') {
    return t('sales.errors.validation');
  }

  if (error.code === 'PERMISSION_DENIED') {
    return t('sales.errors.permissionDenied');
  }

  if (error.code === 'AUTH_REQUIRED') {
    return t('sales.errors.authRequired');
  }

  return t('sales.errors.generic');
}
