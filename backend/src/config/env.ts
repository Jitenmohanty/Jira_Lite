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

  // Redis (BullMQ queues + workers).
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Public base URL of the frontend, used to build links in emails.
  APP_URL: z.string().default('http://localhost:3000'),

  // SMTP (transactional email). If unset in development, a throwaway Ethereal
  // test inbox is created automatically and a preview URL is logged.
  // For Gmail: host smtp.gmail.com, port 465, user = address, pass = app password.
  SMTP_HOST: z.string().optional(),
  // Treat an empty string (e.g. an unset `${SMTP_PORT:-}` in docker-compose) as
  // undefined so coercion doesn't turn "" into 0 and fail the positivity check.
  SMTP_PORT: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Tracer <no-reply@tracer.dev>'),

  // Resend (https://resend.com) — preferred email transport when set; takes
  // precedence over SMTP. `from` must use a Resend-verified domain, or
  // `onboarding@resend.dev` for testing (which only delivers to your own
  // Resend account address). Get a key at resend.com/api-keys.
  RESEND_API_KEY: z.string().optional(),

  // Google OAuth (optional). When both ID and secret are set, "Continue with
  // Google" is enabled. Create credentials at console.cloud.google.com and set
  // the redirect URI to <this API>/auth/google/callback.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:4000/auth/google/callback'),

  // "Ask Tracer" AI assistant (optional). When GEMINI_API_KEY is set the
  // feature is enabled; otherwise the endpoints report the feature as disabled.
  // Get a free key at aistudio.google.com/apikey. Semantic search uses a local
  // embedding model (no key required), so retrieval works even before the LLM
  // is wired.
  GEMINI_API_KEY: z.string().optional(),
  // Gemini 2.5 Flash is fast and available on the free tier; override to a
  // stronger model if you have quota for it.
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  // Hard ceilings so a single question can never run away on cost.
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
  AI_MAX_TOOL_ITERATIONS: z.coerce.number().int().positive().default(6),
  // Per-user question budget (Redis-backed), per window.
  AI_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  AI_RATE_WINDOW_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
