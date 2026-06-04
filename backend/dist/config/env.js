import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
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
    N8N_WEBHOOK_URL: z.string().default(''),
});
export const env = envSchema.parse(process.env);
