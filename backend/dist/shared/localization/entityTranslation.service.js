import { EntityTranslationRepository } from './entityTranslation.repository.js';
import { detectTextLanguage, UI_LANGUAGES } from './language.js';
import { resolveTranslationProvider } from './translationProvider.js';
function trimText(value) {
    return value.trim();
}
const translationProvider = resolveTranslationProvider();
const translationCache = new Map();
async function resolveTranslation(text, sourceLanguage, targetLanguage) {
    if (sourceLanguage === 'unknown' || sourceLanguage === targetLanguage) {
        return {
            translatedText: text,
            origin: 'fallback_copy',
        };
    }
    const cacheKey = `${translationProvider.name}:${sourceLanguage}:${targetLanguage}:${text}`;
    if (translationCache.has(cacheKey)) {
        const cached = translationCache.get(cacheKey);
        if (cached) {
            return {
                translatedText: cached,
                origin: 'auto',
            };
        }
    }
    const translated = await translationProvider.translate({
        text,
        sourceLanguage,
        targetLanguage,
    });
    if (translated) {
        translationCache.set(cacheKey, translated);
        return {
            translatedText: translated,
            origin: 'auto',
        };
    }
    translationCache.set(cacheKey, null);
    return {
        translatedText: text,
        origin: 'fallback_copy',
    };
}
export class EntityTranslationService {
    repository;
    constructor(repository = new EntityTranslationRepository()) {
        this.repository = repository;
    }
    async syncEntityField(input) {
        const text = trimText(input.text);
        if (!text) {
            return;
        }
        const detection = detectTextLanguage(text);
        const sourceLanguage = detection.language === 'unknown'
            ? (input.requestedLanguage ?? 'ru')
            : detection.language;
        await this.repository.upsert({
            entityType: input.entityType,
            entityId: input.entityId,
            fieldName: input.fieldName,
            langCode: sourceLanguage,
            textValue: text,
            sourceLangCode: sourceLanguage,
            isSource: true,
            translationOrigin: 'manual',
            confidence: detection.confidence,
        });
        for (const targetLanguage of UI_LANGUAGES) {
            if (targetLanguage === sourceLanguage) {
                continue;
            }
            const resolved = await resolveTranslation(text, sourceLanguage, targetLanguage);
            if (!resolved?.translatedText) {
                continue;
            }
            await this.repository.upsert({
                entityType: input.entityType,
                entityId: input.entityId,
                fieldName: input.fieldName,
                langCode: targetLanguage,
                textValue: resolved.translatedText,
                sourceLangCode: sourceLanguage,
                isSource: false,
                translationOrigin: resolved.origin,
                confidence: detection.confidence,
            });
        }
    }
}
