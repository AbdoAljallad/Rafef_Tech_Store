import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ruApp from './ru/app.json';
import ruAuth from './ru/auth.json';
import ruCommon from './ru/common.json';
import ruErrors from './ru/errors.json';
import ruModules from './ru/modules.json';
import ruNavigation from './ru/navigation.json';
import ruStatuses from './ru/statuses.json';
import ruValidation from './ru/validation.json';
import arApp from './ar/app.json';
import arAuth from './ar/auth.json';
import arCommon from './ar/common.json';
import arErrors from './ar/errors.json';
import arModules from './ar/modules.json';
import arNavigation from './ar/navigation.json';
import arStatuses from './ar/statuses.json';
import arValidation from './ar/validation.json';
import { DEFAULT_LANGUAGE, getStoredLanguage } from './languagePreference';

i18n.use(initReactI18next).init({
  lng: getStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['ru', 'ar'],
  debug: import.meta.env.DEV,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    ru: {
      app: ruApp,
      auth: ruAuth,
      common: ruCommon,
      errors: ruErrors,
      modules: ruModules,
      navigation: ruNavigation,
      statuses: ruStatuses,
      validation: ruValidation,
    },
    ar: {
      app: arApp,
      auth: arAuth,
      common: arCommon,
      errors: arErrors,
      modules: arModules,
      navigation: arNavigation,
      statuses: arStatuses,
      validation: arValidation,
    },
  },
  defaultNS: 'common',
  ns: ['app', 'auth', 'common', 'errors', 'modules', 'navigation', 'statuses', 'validation'],
});

export default i18n;
