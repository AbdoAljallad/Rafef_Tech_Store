import { env } from '../../../config/env.js';
function normalizeEndpoint(value) {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}
export class LocalTranslateProvider {
    name = 'localtranslate';
    isConfigured() {
        return Boolean(env.LOCAL_TRANSLATE_URL);
    }
    async translate(input) {
        if (!this.isConfigured()) {
            return null;
        }
        try {
            const endpoint = new URL('/translate', normalizeEndpoint(env.LOCAL_TRANSLATE_URL));
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: input.text,
                    source: input.sourceLanguage,
                    target: input.targetLanguage,
                    format: 'text',
                }),
                signal: AbortSignal.timeout(env.INTEGRATION_HTTP_TIMEOUT_MS),
            });
            if (!response.ok) {
                return null;
            }
            const payload = await response.json();
            const translatedText = payload.translatedText?.trim();
            return translatedText ? translatedText : null;
        }
        catch {
            return null;
        }
    }
}
