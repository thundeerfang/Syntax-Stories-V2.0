import type { Request, Response, NextFunction } from 'express';
/**
 * When ALTCHA_HMAC_KEY or JWT_SECRET is set, requires valid `altcha` payload (JSON string or object from widget).
 * If neither key is set and ALTCHA_REQUIRED is false, skips (local dev).
 */
export declare function verifyAltchaIfConfigured(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=verifyAltcha.d.ts.map