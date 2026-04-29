import { Request, Response, NextFunction } from 'express';
import type { AuthUser } from './verifyToken.js';
export type RequestWithOptionalAuth = Request & {
    authUser?: AuthUser;
};
/**
 * If `Authorization: Bearer` is present and valid, sets `req.authUser`.
 * Invalid, missing, or expired tokens are ignored (no 401) so the same route can serve guests.
 */
export declare function optionalVerifyToken(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=optionalVerifyToken.d.ts.map