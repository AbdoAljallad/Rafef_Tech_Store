import { env } from '../../config/env.js';
import { LibreTranslateProvider } from './translationProviders/libreTranslate.provider.js';
import { LocalTranslateProvider } from './translationProviders/localTranslate.provider.js';
import { MicrosoftTranslatorProvider } from './translationProviders/microsoftTranslator.provider.js';
class NoopTranslationProvider {
    name = 'none';
    isConfigured() {
        return false;
    }
    async translate() {
        return null;
    }
}
function createTranslationProvider() {
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
