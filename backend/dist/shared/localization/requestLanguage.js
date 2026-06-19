import { normalizeUiLanguage } from './language.js';
export function resolveRequestLanguage(request) {
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
