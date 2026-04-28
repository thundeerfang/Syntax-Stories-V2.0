import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { errorHandler } from './middlewares/index.js';
import { requestContextMiddleware } from './middlewares/requestContext.js';
import { registerAppListeners } from './bootstrap/registerAppListeners.js';
import passport from './passport/index.js';
import { env } from './config/env.js';
import { getProductionAllowedOrigins, isOriginAllowed } from './config/frontendUrl.js';
import { getRedis } from './config/redis.js';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import {
  registerApiRoutes,
  registerStaticUploads,
  registerUploadApiRoutes,
  registerAuthModuleRoutes,
  registerOAuthRoutes,
} from './bootstrap/index.js';

const app = express();

registerAppListeners();

// Trust first proxy (e.g. Nginx, load balancer) so req.ip and rate limiting are correct
app.set('trust proxy', 1);
app.use(requestContextMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json());
app.use(cookieParser());
// In production allow FRONTEND_URL (comma-separated; use *.example.com for Vercel previews, etc.)
const allowedOrigins = env.NODE_ENV === 'production' ? getProductionAllowedOrigins() : null;
function allowCorsOrigin(origin: string | undefined): boolean {
  if (!allowedOrigins?.length) return false;
  return isOriginAllowed(origin, allowedOrigins);
}

function corsOriginOption():
  | boolean
  | string
  | string[]
  | ((origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void) {
  // Dev: reflect request Origin so localhost vs 127.0.0.1 and any dev port work (ALTCHA, fetch, etc.).
  // A single FRONTEND_URL string rejects the other hostname and breaks the PoW challenge fetch.
  if (env.NODE_ENV !== 'production') return true;
  if (!allowedOrigins?.length) return false;
  return (origin, cb) => {
    cb(null, allowCorsOrigin(origin));
  };
}

app.use(
  cors({
    origin: corsOriginOption(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Idempotency-Key',
      'X-Intent-Token',
      'X-Device-Fingerprint',
    ],
  })
);

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

registerStaticUploads(app);
registerApiRoutes(app);
registerUploadApiRoutes(app);
registerAuthModuleRoutes(app);
registerOAuthRoutes(app);

app.use(errorHandler);

export default app;
