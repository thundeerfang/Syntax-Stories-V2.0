/**
 * Company search proxy using OpenCorporates API (open data, free tier).
 * Set OPENCORPORATES_API_TOKEN in env for live search; otherwise returns empty and frontend uses static list.
 * @see https://api.opencorporates.com/documentation/API-Reference
 */

import { Router, Request, Response } from 'express';
import { ReferenceEntityModel } from '../models/ReferenceEntity.js';

const router = Router();
const OPENCORPORATES_BASE = 'https://api.opencorporates.com/v0.4';
const PER_PAGE = 15;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchSeededCompanies(q: string, limit: number) {
  const filter: Record<string, unknown> = { kind: 'company' };
  if (q.length >= 2) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { domain: rx }];
  }
  const rows = await ReferenceEntityModel.find(filter)
    .sort({ name: 1 })
    .limit(limit)
    .select({ name: 1, domain: 1, _id: 0 })
    .lean();
  return rows.map((row) => ({ name: row.name, domain: row.domain }));
}

/** Derive a likely domain from company name for Clearbit logo (e.g. "Barclays Bank" -> "barclaysbank.com"). */
function nameToDomain(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '')
    .replaceAll(/[^a-z0-9]/g, '');
  return slug ? `${slug}.com` : '';
}

router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) {
    res.status(200).json({ success: true, companies: [] });
    return;
  }

  const token = process.env.OPENCORPORATES_API_TOKEN;
  if (!token) {
    const seeded = await searchSeededCompanies(q, PER_PAGE);
    res.status(200).json({ success: true, companies: seeded });
    return;
  }

  try {
    const url = `${OPENCORPORATES_BASE}/companies/search?q=${encodeURIComponent(q)}&per_page=${PER_PAGE}&api_token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const seeded = await searchSeededCompanies(q, PER_PAGE);
      res.status(200).json({ success: true, companies: seeded });
      return;
    }
    const data = (await response.json()) as {
      results?: { companies?: Array<{ company?: { name?: string } }> };
    };
    const companies = (data.results?.companies ?? [])
      .map((c) => c.company?.name)
      .filter((name): name is string => !!name?.trim())
      .slice(0, PER_PAGE)
      .map((name) => ({
        name: name.trim(),
        domain: nameToDomain(name),
      }));
    if (companies.length > 0) {
      res.status(200).json({ success: true, companies });
      return;
    }
    const seeded = await searchSeededCompanies(q, PER_PAGE);
    res.status(200).json({ success: true, companies: seeded });
  } catch {
    const seeded = await searchSeededCompanies(q, PER_PAGE);
    res.status(200).json({ success: true, companies: seeded });
  }
});

export default router;
