import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  MONGODB_URI: process.env.MONGODB_URI ?? process.env.MONGO_CONN ?? 'mongodb://localhost:27017/syntax-stories',
  REDIS_URL: process.env.REDIS_URL ?? undefined,
  SESSION_SECRET: process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? 'session-secret-min-32-chars',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'https://syntax-stories.vercel.app',
  BACKEND_URL: (process.env.BACKEND_URL ?? '').replace(/\/$/, ''),

  // Email (OTP)
  EMAIL_USER: process.env.EMAIL_USER as string | undefined,
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLOUD_COMPUTING ?? process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLOUD_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,

  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLOUD_SECRET ?? process.env.GITHUB_CLIENT_SECRET,

  // Facebook OAuth
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,

  // X (Twitter) OAuth
  X_CONSUMER_KEY: process.env.X_CONSUMER_KEY ?? process.env.TWITTER_CONSUMER_KEY,
  X_CONSUMER_SECRET: process.env.X_CONSUMER_SECRET ?? process.env.TWITTER_CONSUMER_SECRET,

  // JWT (refresh 30d = logged in 30 days in browser)
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '30d',
  IDEMPOTENCY_TTL_SEC: parseInt(process.env.IDEMPOTENCY_TTL_SEC ?? '86400', 10),
} as const;
