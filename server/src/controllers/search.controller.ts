import type { Request, Response } from "express";
import { getIpHashFromRequest } from "../lib/clientMeta.js";
import { unifiedSearch } from "../services/search/unifiedSearch.service.js";
import { consumeSearchRateLimit } from "../services/search/searchRateLimit.service.js";
import {
  normalizeSearchQuery,
  parseSearchLimit,
  parseSearchTypes,
  parseSearchContext,
  minCharsForSearch,
} from "../services/search/searchQuery.util.js";
export async function getUnifiedSearch(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const q = normalizeSearchQuery(String(req.query.q ?? ""));
    const types = parseSearchTypes(req.query.types);
    const context = parseSearchContext(req.query.context);
    const limit = parseSearchLimit(req.query.limit);
    const minChars = minCharsForSearch(types, context);
    if (q.length > 0 && q.length < minChars) {
      res.status(200).json({
        success: true,
        q,
        minChars,
        cached: false,
        tookMs: 0,
        groups: {},
      });
      return;
    }
    if (q.length >= minChars) {
      const ip = getIpHashFromRequest(req);
      const allowed = await consumeSearchRateLimit(ip);
      if (!allowed) {
        res
          .status(429)
          .json({
            success: false,
            message: "Too many search requests. Try again soon.",
          });
        return;
      }
    }
    const result = await unifiedSearch({ q, types, limit, minChars });
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
}
