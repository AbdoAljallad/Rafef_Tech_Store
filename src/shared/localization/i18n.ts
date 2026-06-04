import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import auth from './ru/auth.json';
import common from './ru/common.json';
import errors from './ru/errors.json';
import modules from './ru/modules.json';
import navigation from './ru/navigation.json';
import statuses from './ru/statuses.json';
import validation from './ru/validation.json';

export const DEFAULT_LANGUAGE = 'ru';

i18n.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  debug: import.meta.env.DEV,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    ru: {
      auth,
      common,
      errors,
      modules,
      navigation,
      statuses,
      validation,
    },
  },
  defaultNS: 'common',
  ns: ['auth', 'common', 'errors', 'modules', 'navigation', 'statuses', 'validation'],
});

export default i18n;
