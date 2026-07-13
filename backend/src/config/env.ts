import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralized, validated environment configuration.
 * The app refuses to boot with a missing/invalid env var rather than failing
 * mysteriously at runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Populated in Stage 1; optional here so the health server can boot standalone.
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(16).default('dev-insecure-secret-change-me-please'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
