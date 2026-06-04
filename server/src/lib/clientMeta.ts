import crypto from 'node:crypto';
import type { Request } from 'express';
import { computeDeviceFingerprint } from '../services/session.service.js';

export function getClientMeta(req: Request): { ip: string; userAgent: string } {
  const ip =
    req.ip ??
    req.socket?.remoteAddress ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    'unknown';
  const userAgent = req.get('User-Agent') ?? '';
  return { ip, userAgent };
}

export function getDeviceHashFromRequest(req: Request): string {
  const { ip, userAgent } = getClientMeta(req);
  const fpHeader = req.headers['x-device-fingerprint'];
  if (typeof fpHeader === 'string' && fpHeader.trim().length >= 8) {
    return crypto.createHash('sha256').update(fpHeader.trim()).digest('hex').slice(0, 32);
  }
  return computeDeviceFingerprint(ip, userAgent);
}

export function getIpHashFromRequest(req: Request): string {
  const { ip } = getClientMeta(req);
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
