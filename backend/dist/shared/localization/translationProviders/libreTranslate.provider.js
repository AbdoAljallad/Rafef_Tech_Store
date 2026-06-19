import { env } from '../../../config/env.js';
function normalizeEndpoint(value) {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}
export class LibreTranslateProvider {
    name = 'libretranslate';
    isConfigured() {
        return Boolean(env.LIBRETRANSLATE_URL);
    }
    async translate(input) {
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
            const body = await response.json();
            const translatedText = body.translatedText?.trim();
            return translatedText ? translatedText : null;
        }
        catch {
            return null;
        }
    }
}
