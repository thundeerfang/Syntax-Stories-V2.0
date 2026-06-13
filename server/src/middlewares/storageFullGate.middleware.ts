import type { Request, Response, NextFunction } from 'express';
import {
  getStorageStatus,
  isStorageGateExempt,
  storageFullPublicMessage,
} from '../services/platform/storageGuard.service.js';

export async function storageFullGate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (isStorageGateExempt(req.method, req.originalUrl)) {
    next();
    return;
  }

  const status = await getStorageStatus();
  if (!status.blocked) {
    next();
    return;
  }

  res.status(503).json({
    success: false,
    code: 'STORAGE_FULL',
    reason: status.reason,
    since: status.since,
    message: storageFullPublicMessage(),
  });
}
