import type { Request, Response } from 'express';
import {
  getStorageStatus,
  resolveUploadsRootForHealth,
  runStorageProbe,
} from '../services/platform/storageGuard.service.js';
import { env } from '../config/env.js';

export async function getStorageHealth(_req: Request, res: Response): Promise<void> {
  await runStorageProbe();
  const status = await getStorageStatus();
  res.status(status.blocked ? 503 : 200).json({
    success: !status.blocked,
    storage: {
      blocked: status.blocked,
      reason: status.reason,
      since: status.since,
      mode: env.STORAGE_FULL_MODE,
      uploadsRoot: resolveUploadsRootForHealth(),
    },
  });
}
