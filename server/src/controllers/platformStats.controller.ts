import type { Request, Response } from 'express';
import { getPublicPlatformStats } from '../services/platform/platformStats.service.js';

/** GET /api/platform/stats — public aggregate counters for marketing surfaces. */
export async function getPlatformStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await getPublicPlatformStats();
    res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error('[platform] stats', err);
    res.status(500).json({ success: false, message: 'Failed to load platform stats' });
  }
}
