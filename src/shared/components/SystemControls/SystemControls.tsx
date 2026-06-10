import { Globe2, MoonStar, Palette, Sparkles, SunMedium, Waves } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useSystemPreferencesStore,
  type SystemAccent,
  type SystemLanguage,
  type SystemTheme,
} from '../../stores/systemPreferencesStore';

const languageLabels: Record<SystemLanguage, { short: string; key: string }> = {
  ru: { short: 'RU', key: 'system.language.ru' },
  ar: { short: 'AR', key: 'system.language.ar' },
};

const themeLabels: Record<SystemTheme, { key: string; icon: typeof SunMedium }> = {
  light: { key: 'system.theme.light', icon: SunMedium },
  night: { key: 'system.theme.night', icon: MoonStar },
  ice: { key: 'system.theme.ice', icon: Waves },
  custom: { key: 'system.theme.custom', icon: Sparkles },
};

const accentLabels: Record<SystemAccent, { short: string; key: string }> = {
  blue: { short: 'B', key: 'system.accent.blue' },
  gold: { short: 'Y', key: 'system.accent.gold' },
  red: { short: 'R', key: 'system.accent.red' },
  emerald: { short: 'E', key: 'system.accent.emerald' },
  violet: { short: 'V', key: 'system.accent.violet' },
};

const languageSequence: SystemLanguage[] = ['ru', 'ar'];

export function SystemControls() {
  const { t } = useTranslation('app');
  const language = useSystemPreferencesStore((state) => state.language);
  const theme = useSystemPreferencesStore((state) => state.theme);
  const accent = useSystemPreferencesStore((state) => state.accent);
  const setLanguage = useSystemPreferencesStore((state) => state.setLanguage);
  const cycleTheme = useSystemPreferencesStore((state) => state.cycleTheme);
  const cycleAccent = useSystemPreferencesStore((state) => state.cycleAccent);

  const currentLanguageIndex = languageSequence.indexOf(language);
  const nextLanguage = languageSequence[(currentLanguageIndex + 1) % languageSequence.length];
  const themeMeta = themeLabels[theme];
  const ThemeIcon = themeMeta.icon;
  const accentMeta = accentLabels[accent];
  const currentLanguageName = t(languageLabels[language].key);
  const nextLanguageName = t(languageLabels[nextLanguage].key);
  const currentThemeName = t(themeMeta.key);
  const currentAccentName = t(accentMeta.key);

  return (
    <div className="system-controls" aria-label={t('system.interfaceSettings')}>
      <button
        className="system-control-button"
        type="button"
        aria-label={t('system.languageButtonAria', { current: currentLanguageName, next: nextLanguageName })}
        onClick={() => setLanguage(nextLanguage)}
      >
        <Globe2 size={16} aria-hidden="true" />
        <span>{languageLabels[language].short}</span>
        <small>{currentLanguageName}</small>
      </button>

      <button
        className="system-control-button"
        type="button"
        aria-label={t('system.themeButtonAria', { current: currentThemeName })}
        onClick={cycleTheme}
      >
        <ThemeIcon size={16} aria-hidden="true" />
        <span>{currentThemeName}</span>
      </button>

      <button
        className="system-control-button accent"
        type="button"
        aria-label={t('system.accentButtonAria', { current: currentAccentName })}
        onClick={cycleAccent}
      >
        <Palette size={16} aria-hidden="true" />
        <span>{accentMeta.short}</span>
        <small>{currentAccentName}</small>
      </button>
    </div>
  );
}
