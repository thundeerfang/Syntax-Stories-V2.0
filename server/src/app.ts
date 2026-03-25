import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import routes from './routes/index';
import uploadRoutes from './routes/upload.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares';
import passport from './passport/index';
import { hasFacebookConfig, hasXConfig, hasDiscordConfig } from './passport/index';
import { env } from './config/env';
import { getFrontendRedirectBase, getProductionAllowedOrigins, isOriginAllowed } from './config/frontendUrl';
import { getRedis } from './config/redis';
import { RedisStore } from 'connect-redis';
import { oauthCallbackHandler, oauthLinkHandler } from './oauth/oauthExpress';
import cookieParser from 'cookie-parser';

const app = express();

// Trust first proxy (e.g. Nginx, load balancer) so req.ip and rate limiting are correct
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json());
app.use(cookieParser());
// In production allow FRONTEND_URL (comma-separated; use *.example.com for Vercel previews, etc.)
const allowedOrigins = env.NODE_ENV === 'production' ? getProductionAllowedOrigins() : null;
const redirectBaseUrl = getFrontendRedirectBase();
function allowCorsOrigin(origin: string | undefined): boolean {
  if (!allowedOrigins?.length) return false;
  return isOriginAllowed(origin, allowedOrigins);
}
app.use(cors({
  origin:
    env.NODE_ENV === 'production'
      ? allowedOrigins?.length
        ? (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
            cb(null, allowCorsOrigin(origin));
          }
        : false
      : (env.FRONTEND_URL ?? true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key', 'X-Intent-Token'],
}));

const sessionConfig: session.SessionOptions = {
  secret: env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: env.NODE_ENV !== 'production',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
};

const redis = getRedis();
if (redis) {
  sessionConfig.store = new RedisStore({ client: redis });
}
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', routes);
app.use('/api/upload', uploadRoutes);
app.use('/auth', authRoutes);

app.get('/auth/google/login', passport.authenticate('google', { scope: ['profile', 'email'], state: 'login' }));
app.get('/auth/google/signup', passport.authenticate('google', { scope: ['profile', 'email'], state: 'signup' }));
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], state: 'login' }));
app.get('/auth/google/link', oauthLinkHandler('google', { scope: ['profile', 'email'] }));
app.get(
  '/auth/google/callback',
  oauthCallbackHandler({
    strategy: 'google',
    failureLabel: 'Google auth failed',
    auditProvider: 'google',
    clientCallbackSlug: 'google-callback',
    idField: 'googleId',
  })
);

app.get('/auth/github/login', passport.authenticate('github', { scope: ['user:email'], state: 'login' }));
app.get('/auth/github/signup', passport.authenticate('github', { scope: ['user:email'], state: 'signup' }));
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], state: 'login' }));
app.get('/auth/github/link', oauthLinkHandler('github', { scope: ['user:email'] }));
app.get(
  '/auth/github/callback',
  oauthCallbackHandler({
    strategy: 'github',
    failureLabel: 'GitHub auth failed',
    auditProvider: 'github',
    clientCallbackSlug: 'github-callback',
    idField: 'gitId',
  })
);

if (hasDiscordConfig) {
  app.get('/auth/discord/login', passport.authenticate('discord', { state: 'login' }));
  app.get('/auth/discord/signup', passport.authenticate('discord', { state: 'signup' }));
  app.get('/auth/discord', passport.authenticate('discord', { state: 'login' }));
  app.get('/auth/discord/link', oauthLinkHandler('discord'));
  app.get(
    '/auth/discord/callback',
    oauthCallbackHandler({
      strategy: 'discord',
      failureLabel: 'Discord auth failed',
      auditProvider: 'discord',
      clientCallbackSlug: 'discord-callback',
      idField: 'discordId',
    })
  );
} else {
  const discordRedirectBase = redirectBaseUrl || 'http://localhost:3000';
  app.get('/auth/discord/login', (_req, res) => {
    res.redirect(`${discordRedirectBase}/login?error=${encodeURIComponent('Discord OAuth is not configured (set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL).')}`);
  });
  app.get('/auth/discord/signup', (_req, res) => {
    res.redirect(`${discordRedirectBase}/login?error=${encodeURIComponent('Discord OAuth is not configured (set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL).')}`);
  });
}

if (hasFacebookConfig) {
  app.get('/auth/facebook/login', passport.authenticate('facebook', { scope: ['email'], state: 'login' }));
  app.get('/auth/facebook/signup', passport.authenticate('facebook', { scope: ['email'], state: 'signup' }));
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'], state: 'login' }));
  app.get('/auth/facebook/link', oauthLinkHandler('facebook', { scope: ['email'] }));
  app.get(
    '/auth/facebook/callback',
    oauthCallbackHandler({
      strategy: 'facebook',
      failureLabel: 'Facebook auth failed',
      auditProvider: 'facebook',
      clientCallbackSlug: 'facebook-callback',
      idField: 'facebookId',
    })
  );
} else {
  app.get('/auth/facebook', (_req, res) =>
    res.status(501).json({ message: 'Facebook login not configured.', success: false })
  );
}

if (hasXConfig) {
  app.get('/auth/x/login', passport.authenticate('twitter', { state: 'login' }));
  app.get('/auth/x/signup', passport.authenticate('twitter', { state: 'signup' }));
  app.get('/auth/x', passport.authenticate('twitter', { state: 'login' }));
  app.get('/auth/x/link', oauthLinkHandler('twitter'));
  app.get(
    '/auth/x/callback',
    oauthCallbackHandler({
      strategy: 'twitter',
      failureLabel: 'X auth failed',
      auditProvider: 'x',
      clientCallbackSlug: 'x-callback',
      idField: 'xId',
    })
  );
} else {
  app.get('/auth/x', (_req, res) =>
    res.status(501).json({ message: 'X (Twitter) login not configured.', success: false })
  );
}

app.get('/auth/apple', (_req, res) => {
  res.status(501).json({
    message: 'Sign in with Apple is not yet configured. Use Google, GitHub, Facebook, Discord, X, or email OTP.',
    success: false,
  });
});

app.use(errorHandler);

export default app;
