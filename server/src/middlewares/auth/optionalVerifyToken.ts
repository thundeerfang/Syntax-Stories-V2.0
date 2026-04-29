import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../config/auth.config.js';
import { SessionModel } from '../../models/Session.js';
import type { AuthUser } from './verifyToken.js';

export type RequestWithOptionalAuth = Request & { authUser?: AuthUser };

/**
 * If `Authorization: Bearer` is present and valid, sets `req.authUser`.
 * Invalid, missing, or expired tokens are ignored (no 401) so the same route can serve guests.
 */
export async function optionalVerifyToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const r = req as RequestWithOptionalAuth;
  r.authUser = undefined;

  if (!token || !authConfig.JWT_ACCESS_PUBLIC_KEY) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, authConfig.JWT_ACCESS_PUBLIC_KEY, {
      algorithms: [authConfig.JWT_ALGORITHM],
    }) as AuthUser;
    if (decoded.sessionId) {
      const session = await SessionModel.findOne({
        _id: decoded.sessionId,
        userId: decoded._id,
        revoked: false,
        expiresAt: { $gt: new Date() },
      });
      if (!session) {
        next();
        return;
      }
    }
    r.authUser = decoded;
  } catch {
    /* treat as anonymous */
  }
  next();
}
