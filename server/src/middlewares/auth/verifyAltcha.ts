import type { Request, Response, NextFunction } from 'express';
import { verifySolution } from 'altcha-lib';
import { env } from '../../config/env.js';

function hmacKey(): string | null {
  const explicit = env.ALTCHA_HMAC_KEY?.trim();
  if (explicit) return explicit;
  if (env.ALTCHA_REQUIRED) {
    return (process.env.JWT_SECRET ?? '').trim() || null;
  }
  return (process.env.JWT_SECRET ?? '').trim() || null;
}

/**
 * When ALTCHA_HMAC_KEY or JWT_SECRET is set, requires valid `altcha` payload (JSON string or object from widget).
 * If neither key is set and ALTCHA_REQUIRED is false, skips (local dev).
 */
export async function verifyAltchaIfConfigured(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }
  const key = hmacKey();
  if (!key) {
    if (env.ALTCHA_REQUIRED) {
      res.status(503).json({
        success: false,
        message: 'ALTCHA is required; set ALTCHA_HMAC_KEY or JWT_SECRET.',
      });
      return;
    }
    next();
    return;
  }

  const raw = (req.body as { altcha?: unknown }).altcha;
  let payload: string;
  if (typeof raw === 'string') payload = raw;
  else if (raw != null && typeof raw === 'object') payload = JSON.stringify(raw);
  else {
    res.status(400).json({ success: false, message: 'ALTCHA verification required.' });
    return;
  }

  try {
    const ok = await verifySolution(payload, key, true);
    if (!ok) {
      res.status(400).json({ success: false, message: 'ALTCHA verification failed.' });
      return;
    }
  } catch {
    res.status(400).json({ success: false, message: 'ALTCHA verification failed.' });
    return;
  }
  next();
}
