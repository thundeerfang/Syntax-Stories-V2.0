import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { authConfig } from '../../../config/auth.config.js';
import { env } from '../../../config/env.js';
import { hasAnyMustReaccept } from './legalPolicyQueries.js';

function pathOnly(req: Request): string {
  const u = req.originalUrl.split('?')[0] ?? '';
  return u.endsWith('/') && u.length > 1 ? u.slice(0, -1) : u;
}

/** §21 — mutations blocked when strict + mustReaccept (except allowlist). */
function isMutationExempt(p: string, method: string): boolean {
  if (method === 'OPTIONS' || method === 'HEAD') return true;
  if (p.startsWith('/api/health')) return true;
  if (p === '/api/ping') return true;
  if (p.startsWith('/api/webhooks/')) return true;
  if (p.startsWith('/api/internal/')) return true;
  if (p.startsWith('/api/v1/legal/policies')) return true;
  if (p === '/api/v1/legal/me/status') return true;
  if (p === '/api/v1/legal/accept') return true;
  if (p === '/api/v1/legal/accept-intent') return true;
  if (p.startsWith('/api/v1/legal/data-deletion-requests')) return true;
  if (p.startsWith('/api/v1/admin/legal')) return true;
  if (p.startsWith('/api/v1/admin/help')) return true;
  if (p.startsWith('/api/v1/admin/trash')) return true;
  if (p.startsWith('/api/v1/admin/management')) return true;
  if (p.startsWith('/api/v1/help/')) return true;
  if (p.startsWith('/api/feedback')) return true;
  if (p.startsWith('/api/contact')) return true;
  if (p.startsWith('/api/invites')) return true;
  if (p.startsWith('/api/billing')) return true;
  if (p.startsWith('/api/bookmarks')) return true;
  if (p.startsWith('/api/reposts')) return true;
  /**
   * Authenticated readers on published posts: Respect / Repost / Bookmark, comment like, batch viewer-state.
   * Same class as billing exemptions: strict LEGAL_RECONSENT_REQUIRED blocks normal signed-in use otherwise.
   * Creating/editing/deleting comment bodies and author-only blog writes stay gated.
   */
  if (method === 'POST' && /^\/api\/blog\/p\/[^/]+\/[^/]+\/(respect|repost|bookmark)$/.test(p)) {
    return true;
  }
  if (method === 'POST' && /^\/api\/blog\/p\/[^/]+\/[^/]+\/comments\/[^/]+\/like$/.test(p)) {
    return true;
  }
  if (
    method === 'POST' &&
    (p === '/api/blog/engagement/viewer-state' || p === '/api/blog/respect/viewer-state')
  ) {
    return true;
  }
  return false;
}

export async function requireLegalAcceptanceForMutations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  if (mongoose.connection.readyState !== 1) {
    next();
    return;
  }

  const p = pathOnly(req);
  if (isMutationExempt(p, method)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !authConfig.JWT_ACCESS_PUBLIC_KEY) {
    next();
    return;
  }

  let userId: string | undefined;
  try {
    const decoded = jwt.verify(token, authConfig.JWT_ACCESS_PUBLIC_KEY, {
      algorithms: [authConfig.JWT_ALGORITHM],
    }) as { _id?: string };
    userId = decoded._id;
  } catch {
    next();
    return;
  }

  if (!userId) {
    next();
    return;
  }

  try {
    const must = await hasAnyMustReaccept(userId);
    if (!must) {
      next();
      return;
    }
    if (env.LEGAL_ENFORCEMENT_MODE === 'strict') {
      res.status(403).json({
        ok: false,
        code: 'LEGAL_RECONSENT_REQUIRED',
        message: 'You must accept the latest Terms and Privacy Policy before this action.',
      });
      return;
    }
    res.setHeader('X-Legal-Reconsent-Required', '1');
    next();
  } catch {
    next();
  }
}
