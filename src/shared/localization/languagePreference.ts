export const DEFAULT_LANGUAGE = 'ru' as const;

export function getStoredLanguage() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  try {
    const raw = window.localStorage.getItem('rafef-system-preferences');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.language === 'ar' ? 'ar' : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
