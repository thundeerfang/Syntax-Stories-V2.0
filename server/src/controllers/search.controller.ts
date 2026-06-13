import type { Request, Response } from 'express';
import { getIpHashFromRequest } from '../lib/clientMeta.js';
import { unifiedSearch } from '../services/search/unifiedSearch.service.js';
import { consumeSearchRateLimit } from '../services/search/searchRateLimit.service.js';
import {
  normalizeSearchQuery,
  parseSearchLimit,
  parseSearchTypes,
  SEARCH_MIN_CHARS,
} from '../services/search/searchQuery.util.js';

/** GET /api/search?q=&types=all&limit=5 — unified navbar search (public). */
export async function getUnifiedSearch(req: Request, res: Response): Promise<void> {
  try {
    const q = normalizeSearchQuery(String(req.query.q ?? ''));
    const types = parseSearchTypes(req.query.types);
    const limit = parseSearchLimit(req.query.limit);

    if (q.length > 0 && q.length < SEARCH_MIN_CHARS) {
      res.status(200).json({
        success: true,
        q,
        minChars: SEARCH_MIN_CHARS,
        cached: false,
        tookMs: 0,
        groups: {},
      });
      return;
    }

    if (q.length >= SEARCH_MIN_CHARS) {
      const ip = getIpHashFromRequest(req);
      const allowed = await consumeSearchRateLimit(ip);
      if (!allowed) {
        res.status(429).json({ success: false, message: 'Too many search requests. Try again soon.' });
        return;
      }
    }

    const result = await unifiedSearch({ q, types, limit });
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
}
