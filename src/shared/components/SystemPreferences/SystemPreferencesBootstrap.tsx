import { useEffect } from 'react';
import i18n from '../../localization/i18n';
import { useSystemPreferencesStore } from '../../stores/systemPreferencesStore';

export function SystemPreferencesBootstrap() {
  const theme = useSystemPreferencesStore((state) => state.theme);
  const language = useSystemPreferencesStore((state) => state.language);
  const accent = useSystemPreferencesStore((state) => state.accent);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return null;
}
