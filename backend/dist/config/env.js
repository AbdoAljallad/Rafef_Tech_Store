import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const booleanFlag = z.preprocess((value) => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) {
            return true;
        }
        if (['0', 'false', 'no', 'off', ''].includes(normalized)) {
            return false;
        }
    }
    return value;
}, z.boolean().default(false));
const translationProviderFlag = z.preprocess((value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized || normalized === 'none' || normalized === 'disabled' || normalized === 'off') {
        return 'none';
    }
    if (normalized === 'localtranslate' || normalized === 'argos' || normalized === 'argos_local') {
        return 'localtranslate';
    }
    if (normalized === 'libretranslate' || normalized === 'libre_translate') {
        return 'libretranslate';
    }
    if (normalized === 'microsoft' || normalized === 'azure' || normalized === 'microsoft_translator') {
        return 'microsoft_translator';
    }
    return value;
}, z.enum(['none', 'localtranslate', 'libretranslate', 'microsoft_translator']).default('none'));
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_BASE_URL: z.string().url().default('http://localhost:5173'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    MYSQL_HOST: z.string().default('localhost'),
    MYSQL_PORT: z.coerce.number().int().positive().default(3306),
    MYSQL_USER: z.string().default('root'),
    MYSQL_PASSWORD: z.string().default(''),
    MYSQL_DATABASE: z.string().default('rafef_tech'),
    SESSION_COOKIE_NAME: z.string().default('rt_session'),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
    SESSION_SECRET: z.string().min(12).default('change-this-local-secret'),
    SEED_ADMIN_USERNAME: z.string().default('admin'),
    SEED_ADMIN_PASSWORD: z.string().min(8).default('admin123'),
    SEED_AI_ASSISTANT_PASSWORD: z.string().default(''),
    N8N_ENABLED: booleanFlag,
    N8N_WEBHOOK_URL: z.string().default(''),
    N8N_HEALTH_URL: z.string().default(''),
    N8N_SHARED_SECRET: z.string().default(''),
    INTEGRATION_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
    TRANSLATION_PROVIDER: translationProviderFlag,
    LOCAL_TRANSLATE_URL: z.string().url().default('http://localhost:5002'),
    LIBRETRANSLATE_URL: z.string().url().default('http://localhost:5000'),
    LIBRETRANSLATE_API_KEY: z.string().default(''),
    MICROSOFT_TRANSLATOR_ENDPOINT: z.string().url().default('https://api.cognitive.microsofttranslator.com'),
    MICROSOFT_TRANSLATOR_KEY: z.string().default(''),
    MICROSOFT_TRANSLATOR_REGION: z.string().default(''),
    OPENCLAW_ENABLED: booleanFlag,
    OPENCLAW_GATEWAY_URL: z.string().default(''),
    OPENCLAW_TRANSLATE_PATH: z.string().default('/translate'),
});
export const env = envSchema.parse(process.env);
