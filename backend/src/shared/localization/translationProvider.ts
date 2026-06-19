import { env } from '../../config/env.js';
import type { DetectedLanguage, UiLanguage } from './language.js';
import { LibreTranslateProvider } from './translationProviders/libreTranslate.provider.js';
import { LocalTranslateProvider } from './translationProviders/localTranslate.provider.js';
import { MicrosoftTranslatorProvider } from './translationProviders/microsoftTranslator.provider.js';

export type TranslationProviderName = 'none' | 'localtranslate' | 'libretranslate' | 'microsoft_translator';

export type TranslateTextInput = {
  text: string;
  sourceLanguage: Exclude<DetectedLanguage, 'unknown'>;
  targetLanguage: UiLanguage;
};

type TranslationProvider = {
  readonly name: TranslationProviderName;
  isConfigured(): boolean;
  translate(input: TranslateTextInput): Promise<string | null>;
};

class NoopTranslationProvider implements TranslationProvider {
  readonly name = 'none' as const;

  isConfigured() {
    return false;
  }

  async translate() {
    return null;
  }
}

function createTranslationProvider(): TranslationProvider {
  switch (env.TRANSLATION_PROVIDER) {
    case 'localtranslate':
      return new LocalTranslateProvider();
    case 'libretranslate':
      return new LibreTranslateProvider();
    case 'microsoft_translator':
      return new MicrosoftTranslatorProvider();
    default:
      return new NoopTranslationProvider();
  }
}

const translationProvider = createTranslationProvider();

export function resolveTranslationProvider() {
  return translationProvider;
}
