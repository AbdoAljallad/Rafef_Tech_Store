import { EntityTranslationRepository } from './entityTranslation.repository.js';
import { detectTextLanguage, UI_LANGUAGES, type DetectedLanguage, type UiLanguage } from './language.js';
import { resolveTranslationProvider } from './translationProvider.js';

type SyncTranslationInput = {
  entityType: string;
  entityId: number;
  fieldName: string;
  text: string;
  requestedLanguage?: UiLanguage | null;
};

type TranslationResponse = {
  translatedText: string | null;
  origin: 'auto' | 'fallback_copy';
};

function trimText(value: string) {
  return value.trim();
}

const translationProvider = resolveTranslationProvider();
const translationCache = new Map<string, string | null>();

async function resolveTranslation(text: string, sourceLanguage: DetectedLanguage, targetLanguage: UiLanguage): Promise<TranslationResponse | null> {
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
  constructor(private readonly repository = new EntityTranslationRepository()) {}

  async syncEntityField(input: SyncTranslationInput) {
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
