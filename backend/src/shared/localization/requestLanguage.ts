import type { Request } from 'express';
import { normalizeUiLanguage, type UiLanguage } from './language.js';

export function resolveRequestLanguage(request: Request): UiLanguage {
  const explicit = request.header('x-rafef-language');
  if (explicit) {
    return normalizeUiLanguage(explicit);
  }

  const acceptLanguage = request.header('accept-language');
  if (acceptLanguage) {
    return normalizeUiLanguage(acceptLanguage);
  }

  return 'ru';
}
