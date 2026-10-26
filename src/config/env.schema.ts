import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Team invites are emailed via Resend (https://resend.com).
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().default('onboarding@resend.dev'),

  // Gmail inbox ingestion — self-service per org (Automations > Integrations
  // connects a Gmail account via OAuth; department + keywords are set there
  // too, and stored on the GmailIntegration doc, not here). Only the
  // shared Google Cloud OAuth app credentials live in env — all optional,
  // so the ingestion service no-ops at boot when unset rather than
  // failing it, since most environments won't have this configured.
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  /** Must exactly match an "Authorized redirect URI" on the Google Cloud OAuth client. */
  GMAIL_OAUTH_REDIRECT_URI: z.string().optional(),
  GMAIL_POLL_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Bound into ConfigModule.forRoot({ validate }) so the process fails fast
 * at boot on missing/malformed config instead of failing on the first
 * Mongo call or the first signed JWT.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
