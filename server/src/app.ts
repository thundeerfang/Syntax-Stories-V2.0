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

const app = express();

// Trust first proxy (e.g. Nginx, load balancer) so req.ip and rate limiting are correct
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json());
// In production use only FRONTEND_URL; never allow all origins (true) in production
app.use(cors({
  origin: env.NODE_ENV === 'production' ? (env.FRONTEND_URL ?? false) : (env.FRONTEND_URL ?? true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key', 'X-Intent-Token'],
}));

const sessionConfig: session.SessionOptions = {
  secret: env.SESSION_SECRET,
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

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const payload = req.user as { user?: { _id: string; googleId?: string }; token?: string };
    const user = payload?.user;
    if (!user?._id) return res.redirect(env.FRONTEND_URL + '/');
    const token = signAccessToken({ _id: user._id, googleId: user.googleId });
    res.redirect(`${env.FRONTEND_URL}/google-callback?token=${token}&userId=${user._id}&googleId=${user.googleId ?? ''}`);
  }
);

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    const payload = req.user as { user?: { _id: string; gitId?: string }; token?: string };
    const user = payload?.user;
    if (!user?._id) return res.redirect(env.FRONTEND_URL + '/');
    const token = signAccessToken({ _id: user._id, gitId: user.gitId });
    res.redirect(`${env.FRONTEND_URL}/github-callback?token=${token}&userId=${user._id}&gitId=${user.gitId ?? ''}`);
  }
);

if (hasFacebookConfig) {
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  app.get(
    '/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    (req, res) => {
      const payload = req.user as { user?: { _id: string; facebookId?: string }; token?: string };
      const user = payload?.user;
      if (!user?._id) return res.redirect(env.FRONTEND_URL + '/');
      const token = signAccessToken({ _id: user._id, facebookId: user.facebookId });
      res.redirect(`${env.FRONTEND_URL}/facebook-callback?token=${token}&userId=${user._id}&facebookId=${user.facebookId ?? ''}`);
    }
  );
} else {
  app.get('/auth/facebook', (_req, res) =>
    res.status(501).json({ message: 'Facebook login not configured.', success: false })
  );
}

if (hasXConfig) {
  app.get('/auth/x', passport.authenticate('twitter'));
  app.get(
    '/auth/x/callback',
    passport.authenticate('twitter', { failureRedirect: '/' }),
    (req, res) => {
      const payload = req.user as { user?: { _id: string; xId?: string }; token?: string };
      const user = payload?.user;
      if (!user?._id) return res.redirect(env.FRONTEND_URL + '/');
      const token = signAccessToken({ _id: user._id, xId: user.xId });
      res.redirect(`${env.FRONTEND_URL}/x-callback?token=${token}&userId=${user._id}&xId=${user.xId ?? ''}`);
    }
  );
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
