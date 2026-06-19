import { env } from '../../../config/env.js';
import type { TranslateTextInput, TranslationProviderName } from '../translationProvider.js';

type LibreTranslateResponse = {
  translatedText?: string;
};

function normalizeEndpoint(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export class LibreTranslateProvider {
  readonly name: TranslationProviderName = 'libretranslate';

  isConfigured() {
    return Boolean(env.LIBRETRANSLATE_URL);
  }

  async translate(input: TranslateTextInput): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const endpoint = new URL('/translate', normalizeEndpoint(env.LIBRETRANSLATE_URL));
      const payload = {
        q: input.text,
        source: input.sourceLanguage,
        target: input.targetLanguage,
        format: 'text',
        ...(env.LIBRETRANSLATE_API_KEY ? { api_key: env.LIBRETRANSLATE_API_KEY } : {}),
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(env.INTEGRATION_HTTP_TIMEOUT_MS),
      });

      if (!response.ok) {
        return null;
      }

      const body = await response.json() as LibreTranslateResponse;
      const translatedText = body.translatedText?.trim();
      return translatedText ? translatedText : null;
    } catch {
      return null;
    }
  }
}
