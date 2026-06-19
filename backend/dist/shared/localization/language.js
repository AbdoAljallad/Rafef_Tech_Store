export const UI_LANGUAGES = ['ru', 'ar'];
function countMatches(value, pattern) {
    const matches = value.match(pattern);
    return matches ? matches.length : 0;
}
export function normalizeUiLanguage(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized.startsWith('ar') ? 'ar' : 'ru';
}
export function detectTextLanguage(value) {
    const text = value
        .normalize('NFKC')
        .replace(/\p{Cf}/gu, '')
        .trim();
    if (!text) {
        return { language: 'unknown', confidence: 0 };
    }
    const arabicCount = countMatches(text, /\p{Script=Arabic}/gu);
    const cyrillicCount = countMatches(text, /\p{Script=Cyrillic}/gu);
    const latinCount = countMatches(text, /\p{Script=Latin}/gu);
    const totalLetters = arabicCount + cyrillicCount + latinCount;
    if (!totalLetters) {
        return { language: 'unknown', confidence: 0.2 };
    }
    const ranked = [
        { language: 'ar', count: arabicCount },
        { language: 'ru', count: cyrillicCount },
        { language: 'en', count: latinCount },
    ].sort((left, right) => right.count - left.count);
    const top = ranked[0];
    const next = ranked[1];
    if (!top || top.count === 0) {
        return { language: 'unknown', confidence: 0.2 };
    }
    const nextCount = next?.count ?? 0;
    const confidence = Number((top.count / Math.max(totalLetters, 1) - nextCount / Math.max(totalLetters, 1) * 0.15).toFixed(2));
    return {
        language: top.language,
        confidence: Math.max(0.2, Math.min(1, confidence)),
    };
}
