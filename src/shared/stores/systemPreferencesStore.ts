import { create } from 'zustand';

export type SystemTheme = 'light' | 'night' | 'ice' | 'custom';
export type SystemLanguage = 'ru' | 'ar';
export type SystemAccent = 'blue' | 'gold' | 'red' | 'emerald' | 'violet';

type SystemPreferencesState = {
  theme: SystemTheme;
  language: SystemLanguage;
  accent: SystemAccent;
  setTheme: (theme: SystemTheme) => void;
  cycleTheme: () => void;
  setLanguage: (language: SystemLanguage) => void;
  setAccent: (accent: SystemAccent) => void;
  cycleAccent: () => void;
};

const STORAGE_KEY = 'rafef-system-preferences';
const THEME_SEQUENCE: SystemTheme[] = ['light', 'night', 'ice', 'custom'];
const ACCENT_SEQUENCE: SystemAccent[] = ['blue', 'gold', 'red', 'emerald', 'violet'];

function isTheme(value: unknown): value is SystemTheme {
  return value === 'light' || value === 'night' || value === 'ice' || value === 'custom';
}

function isLanguage(value: unknown): value is SystemLanguage {
  return value === 'ru' || value === 'ar';
}

function isAccent(value: unknown): value is SystemAccent {
  return value === 'blue' || value === 'gold' || value === 'red' || value === 'emerald' || value === 'violet';
}

function getStoredPreferences(): Pick<SystemPreferencesState, 'theme' | 'language' | 'accent'> {
  if (typeof window === 'undefined') {
    return {
      theme: 'light',
      language: 'ru',
      accent: 'blue',
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        theme: 'light',
        language: 'ru',
        accent: 'blue',
      };
    }

    const parsed = JSON.parse(raw) as Partial<Pick<SystemPreferencesState, 'theme' | 'language' | 'accent'>>;
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : 'light',
      language: isLanguage(parsed.language) ? parsed.language : 'ru',
      accent: isAccent(parsed.accent) ? parsed.accent : 'blue',
    };
  } catch {
    return {
      theme: 'light',
      language: 'ru',
      accent: 'blue',
    };
  }
}

function persistPreferences(theme: SystemTheme, language: SystemLanguage, accent: SystemAccent) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      theme,
      language,
      accent,
    }),
  );
}

const storedPreferences = getStoredPreferences();

export const useSystemPreferencesStore = create<SystemPreferencesState>((set, get) => ({
  theme: storedPreferences.theme,
  language: storedPreferences.language,
  accent: storedPreferences.accent,

  setTheme(theme) {
    persistPreferences(theme, get().language, get().accent);
    set({ theme });
  },

  cycleTheme() {
    const currentTheme = get().theme;
    const currentIndex = THEME_SEQUENCE.indexOf(currentTheme);
    const nextTheme = THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];
    persistPreferences(nextTheme, get().language, get().accent);
    set({ theme: nextTheme });
  },

  setLanguage(language) {
    persistPreferences(get().theme, language, get().accent);
    set({ language });
  },

  setAccent(accent) {
    persistPreferences(get().theme, get().language, accent);
    set({ accent });
  },

  cycleAccent() {
    const currentAccent = get().accent;
    const currentIndex = ACCENT_SEQUENCE.indexOf(currentAccent);
    const nextAccent = ACCENT_SEQUENCE[(currentIndex + 1) % ACCENT_SEQUENCE.length];
    persistPreferences(get().theme, get().language, nextAccent);
    set({ accent: nextAccent });
  },
}));
