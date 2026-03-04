import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import routes from './routes/index';
import { signAccessToken } from './config/jwt';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares';
import passport from './passport/index';
import { hasFacebookConfig, hasXConfig } from './passport/index';
import { env } from './config/env';
import { getRedis } from './config/redis';
import { RedisStore } from 'connect-redis';
import { UserModel } from './models/User';
import { createAuthChallenge } from './utils/authChallenge';

const app = express();

// Trust first proxy (e.g. Nginx, load balancer) so req.ip and rate limiting are correct
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json());
// In production allow FRONTEND_URL (comma-separated; use *.example.com to allow any origin ending with .example.com, e.g. Vercel previews)
const allowedOrigins =
  env.NODE_ENV === 'production'
    ? (env.FRONTEND_URL ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : null;
// For redirects use only the first URL (comma-separated list would produce invalid redirect URLs)
const redirectBaseUrl = (env.FRONTEND_URL ?? '').split(',')[0]?.trim() ?? (env.FRONTEND_URL ?? '');
function allowOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (!allowedOrigins?.length) return false;
  const originHost = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
  })();
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1); // e.g. ".vercel.app"
      if (originHost === suffix.slice(1) || originHost.endsWith(suffix)) return true;
    } else if (origin === allowed) return true;
  }
  return false;
}
app.use(cors({
  origin:
    env.NODE_ENV === 'production'
      ? allowedOrigins?.length
        ? (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
            cb(null, allowOrigin(origin));
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

app.use('/api', routes);
app.use('/auth', authRoutes);

app.get('/auth/google/login', passport.authenticate('google', { scope: ['profile', 'email'], state: 'login' }));
app.get('/auth/google/signup', passport.authenticate('google', { scope: ['profile', 'email'], state: 'signup' }));
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], state: 'login' }));
app.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err: unknown, userObj?: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : 'Google auth failed';
      return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent(msg)}`);
    }
    const u = userObj as { _id?: string; googleId?: string } | undefined;
    if (!u?._id) return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('Google auth failed')}`);
    const dbUser = await UserModel.findById(u._id).lean();
    if (dbUser?.twoFactorEnabled) {
      try {
        const { challengeToken } = await createAuthChallenge(String(u._id));
        return res.redirect(`${redirectBaseUrl}/google-callback?twoFactorRequired=1&challengeToken=${encodeURIComponent(challengeToken)}`);
      } catch {
        return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('2FA temporarily unavailable')}`);
      }
    }
    const token = signAccessToken({ _id: u._id, googleId: u.googleId });
    return res.redirect(`${redirectBaseUrl}/google-callback?token=${token}&userId=${u._id}&googleId=${u.googleId ?? ''}`);
  })(req, res, next);
});

app.get('/auth/github/login', passport.authenticate('github', { scope: ['user:email'], state: 'login' }));
app.get('/auth/github/signup', passport.authenticate('github', { scope: ['user:email'], state: 'signup' }));
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], state: 'login' }));
app.get('/auth/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, async (err: unknown, userObj?: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : 'GitHub auth failed';
      return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent(msg)}`);
    }
    const u = userObj as { _id?: string; gitId?: string } | undefined;
    if (!u?._id) return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('GitHub auth failed')}`);
    const dbUser = await UserModel.findById(u._id).lean();
    if (dbUser?.twoFactorEnabled) {
      try {
        const { challengeToken } = await createAuthChallenge(String(u._id));
        return res.redirect(`${redirectBaseUrl}/github-callback?twoFactorRequired=1&challengeToken=${encodeURIComponent(challengeToken)}`);
      } catch {
        return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('2FA temporarily unavailable')}`);
      }
    }
    const token = signAccessToken({ _id: u._id, gitId: u.gitId });
    return res.redirect(`${redirectBaseUrl}/github-callback?token=${token}&userId=${u._id}&gitId=${u.gitId ?? ''}`);
  })(req, res, next);
});

if (hasFacebookConfig) {
  app.get('/auth/facebook/login', passport.authenticate('facebook', { scope: ['email'], state: 'login' }));
  app.get('/auth/facebook/signup', passport.authenticate('facebook', { scope: ['email'], state: 'signup' }));
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'], state: 'login' }));
  app.get('/auth/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', { session: false }, async (err: unknown, userObj?: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'Facebook auth failed';
        return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent(msg)}`);
      }
      const u = userObj as { _id?: string; facebookId?: string } | undefined;
      if (!u?._id) return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('Facebook auth failed')}`);
      const dbUser = await UserModel.findById(u._id).lean();
      if (dbUser?.twoFactorEnabled) {
        try {
          const { challengeToken } = await createAuthChallenge(String(u._id));
          return res.redirect(`${redirectBaseUrl}/facebook-callback?twoFactorRequired=1&challengeToken=${encodeURIComponent(challengeToken)}`);
        } catch {
          return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('2FA temporarily unavailable')}`);
        }
      }
      const token = signAccessToken({ _id: u._id, facebookId: u.facebookId });
      return res.redirect(`${redirectBaseUrl}/facebook-callback?token=${token}&userId=${u._id}&facebookId=${u.facebookId ?? ''}`);
    })(req, res, next);
  });
} else {
  app.get('/auth/facebook', (_req, res) =>
    res.status(501).json({ message: 'Facebook login not configured.', success: false })
  );
}

if (hasXConfig) {
  app.get('/auth/x/login', passport.authenticate('twitter', { state: 'login' }));
  app.get('/auth/x/signup', passport.authenticate('twitter', { state: 'signup' }));
  app.get('/auth/x', passport.authenticate('twitter', { state: 'login' }));
app.get('/auth/x/callback', (req, res, next) => {
    passport.authenticate('twitter', { session: false }, async (err: unknown, userObj?: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'X auth failed';
        return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent(msg)}`);
      }
      const u = userObj as { _id?: string; xId?: string } | undefined;
      if (!u?._id) return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('X auth failed')}`);
      const dbUser = await UserModel.findById(u._id).lean();
      if (dbUser?.twoFactorEnabled) {
        try {
          const { challengeToken } = await createAuthChallenge(String(u._id));
          return res.redirect(`${redirectBaseUrl}/x-callback?twoFactorRequired=1&challengeToken=${encodeURIComponent(challengeToken)}`);
        } catch {
          return res.redirect(`${redirectBaseUrl}/login?error=${encodeURIComponent('2FA temporarily unavailable')}`);
        }
      }
      const token = signAccessToken({ _id: u._id, xId: u.xId });
      return res.redirect(`${redirectBaseUrl}/x-callback?token=${token}&userId=${u._id}&xId=${u.xId ?? ''}`);
    })(req, res, next);
  });
} else {
  app.get('/auth/x', (_req, res) =>
    res.status(501).json({ message: 'X (Twitter) login not configured.', success: false })
  );
}

app.get('/auth/apple', (_req, res) => {
  res.status(501).json({
    message: 'Sign in with Apple is not yet configured. Use Google, GitHub, Facebook, X, or email OTP.',
    success: false,
  });
});

app.use(errorHandler);

export default app;
