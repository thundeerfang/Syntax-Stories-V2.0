import type { Express } from 'express';
/**
 * JSON auth API at `/auth/*` (OTP, refresh, profile, 2FA, QR login, …).
 * Must be registered before OAuth browser routes so unknown `/auth/...` paths fall through.
 */
export declare function registerAuthModuleRoutes(app: Express): void;
//# sourceMappingURL=registerAuthModuleRoutes.d.ts.map