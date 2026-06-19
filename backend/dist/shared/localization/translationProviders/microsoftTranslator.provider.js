import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
function normalizeEndpoint(value) {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}
export class MicrosoftTranslatorProvider {
    name = 'microsoft_translator';
    isConfigured() {
        return Boolean(env.MICROSOFT_TRANSLATOR_KEY && env.MICROSOFT_TRANSLATOR_REGION);
    }
    async translate(input) {
        if (!this.isConfigured()) {
            return null;
        }
        try {
            const endpoint = new URL('/translate', normalizeEndpoint(env.MICROSOFT_TRANSLATOR_ENDPOINT));
            endpoint.searchParams.set('api-version', '3.0');
            endpoint.searchParams.set('from', input.sourceLanguage);
            endpoint.searchParams.set('to', input.targetLanguage);
            endpoint.searchParams.set('textType', 'plain');
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': env.MICROSOFT_TRANSLATOR_KEY,
                    'Ocp-Apim-Subscription-Region': env.MICROSOFT_TRANSLATOR_REGION,
                    'X-ClientTraceId': crypto.randomUUID(),
                },
                body: JSON.stringify([{ text: input.text }]),
                signal: AbortSignal.timeout(env.INTEGRATION_HTTP_TIMEOUT_MS),
            });
            if (!response.ok) {
                return null;
            }
            const payload = await response.json();
            const translatedText = payload[0]?.translations?.[0]?.text?.trim();
            return translatedText ? translatedText : null;
        }
        catch {
            return null;
        }
    }
}
