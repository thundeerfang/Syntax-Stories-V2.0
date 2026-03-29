import type { Express } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';

/**
 * JSON auth API at `/auth/*` (OTP, refresh, profile, 2FA, QR login, …).
 * Must be registered before OAuth browser routes so unknown `/auth/...` paths fall through.
 */
export function registerAuthModuleRoutes(app: Express): void {
  app.use('/auth', authRoutes);
}
