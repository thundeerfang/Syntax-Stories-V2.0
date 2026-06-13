import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';

export function requireScimBearer(req: Request, res: Response, next: NextFunction): void {
  if (!env.FEATURE_SCIM_PROVISIONING) {
    res.status(503).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'SCIM provisioning is not enabled',
      status: '503',
    });
    return;
  }
  const expected = env.SCIM_BEARER_TOKEN;
  if (!expected) {
    res.status(503).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'SCIM_BEARER_TOKEN is not configured',
      status: '503',
    });
    return;
  }
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || token !== expected) {
    res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Unauthorized',
      status: '401',
    });
    return;
  }
  next();
}
