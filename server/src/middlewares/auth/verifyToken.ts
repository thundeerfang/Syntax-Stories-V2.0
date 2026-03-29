import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../config/auth.config.js';
import { SessionModel } from '../../models/Session.js';

export interface AuthUser {
  _id: string;
  sessionId?: string;
}

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: 'No token provided', success: false });
    return;
  }

  try {
    if (!authConfig.JWT_ACCESS_PUBLIC_KEY) {
      res.status(503).json({ message: 'Auth not configured', success: false });
      return;
    }
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
        res.status(401).json({
          message: 'Session invalid or revoked. Please log in again.',
          success: false,
        });
        return;
      }
    }
    (req as Request & { user: AuthUser }).user = decoded;
    next();
  } catch (err) {
    const message =
      (err as jwt.JsonWebTokenError).name === 'TokenExpiredError'
        ? 'Token expired. Please refresh or log in again.'
        : 'Invalid token';
    res.status(401).json({ message, success: false });
  }
}
