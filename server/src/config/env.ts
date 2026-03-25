import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT as string, 10),
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGO_CONN,
  REDIS_URL: process.env.REDIS_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: (process.env.BACKEND_URL || '').replace(/\/$/, ''),

  // Email (OTP) — SMTP (e.g. Gmail) or HTTP API (e.g. Resend: POST https://api.resend.com/emails)
  EMAIL_USER: process.env.EMAIL_USER as string | undefined,
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS,
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT ?? '587', 10),
  /** When using API, verified sender (e.g. onboarding@resend.dev). Falls back to EMAIL_USER. */
  EMAIL_FROM: process.env.EMAIL_FROM as string | undefined,
  EMAIL_API_URL: process.env.EMAIL_API_URL as string | undefined,
  EMAIL_API_KEY: process.env.EMAIL_API_KEY as string | undefined,
  /** bearer = Authorization: Bearer <key>. header = custom header (see EMAIL_API_HEADER_NAME). */
  EMAIL_API_AUTH: (process.env.EMAIL_API_AUTH ?? 'bearer') as 'bearer' | 'header',
  EMAIL_API_HEADER_NAME: process.env.EMAIL_API_HEADER_NAME as string | undefined,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLOUD_COMPUTING ?? process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLOUD_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,

  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLOUD_SECRET ?? process.env.GITHUB_CLIENT_SECRET,

  // Facebook OAuth
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,

  // X (Twitter) OAuth — X Developer Portal may show "Client ID" / "Client Secret" (same as consumer key/secret for OAuth 1.0a)
  X_CONSUMER_KEY: process.env.X_CONSUMER_KEY ?? process.env.X_CLIENT_ID ?? process.env.TWITTER_CONSUMER_KEY,
  X_CONSUMER_SECRET: process.env.X_CONSUMER_SECRET ?? process.env.X_CLIENT_SECRET ?? process.env.TWITTER_CONSUMER_SECRET,

  // Discord OAuth2 (https://discord.com/developers/applications)
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,

  // JWT (7d = stay logged in 7 days; refresh to get new access token when expired)
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '7d',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  IDEMPOTENCY_TTL_SEC: parseInt(process.env.IDEMPOTENCY_TTL_SEC ?? '86400', 10),
} as const;
