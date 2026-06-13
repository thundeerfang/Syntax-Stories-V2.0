import type { Request, Response } from 'express';
import { ReferenceEntityModel, type ReferenceEntityKind } from '../models/ReferenceEntity.js';
import { TechStackReferenceModel } from '../models/TechStackReference.js';
import { toTechStackItemDto, type TechStackItemDto } from '../lib/techStackReference.mapper.js';
import { resolveTechStackNames } from '../services/techStackReference.service.js';
import { PAGINATION, parseLimit } from '../shared/http/pagination.js';

const ENTITY_KINDS = new Set<ReferenceEntityKind>(['company', 'school', 'organization']);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseKind(raw: unknown): ReferenceEntityKind | null {
  const kind = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return ENTITY_KINDS.has(kind as ReferenceEntityKind) ? (kind as ReferenceEntityKind) : null;
}

export async function searchReferenceEntities(req: Request, res: Response): Promise<void> {
  const kind = parseKind(req.query.kind);
  if (!kind) {
    res
      .status(400)
      .json({ success: false, message: 'kind must be company, school, or organization' });
    return;
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = parseLimit(req.query.limit, PAGINATION.reference);

  const filter: Record<string, unknown> = { kind };
  if (q.length >= 2) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { domain: rx }];
  } else if (q.length === 1) {
    res.status(200).json({ success: true, entities: [] });
    return;
  }

  const rows = await ReferenceEntityModel.find(filter)
    .sort({ name: 1 })
    .limit(limit)
    .select({ name: 1, domain: 1, _id: 0 })
    .lean();

  res.status(200).json({
    success: true,
    entities: rows.map((row) => ({ name: row.name, domain: row.domain })),
  });
}

export async function searchTechStackReference(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = parseLimit(req.query.limit, PAGINATION.reference);

  if (!q) {
    res.status(200).json({ success: true, items: [] satisfies TechStackItemDto[] });
    return;
  }

  const rx = new RegExp(escapeRegex(q), 'i');
  const rows = await TechStackReferenceModel.find({
    $or: [{ name: rx }, { slug: rx }],
  })
    .sort({ name: 1 })
    .limit(limit)
    .select({ name: 1, slug: 1, category: 1, iconSlug: 1, _id: 0 })
    .lean();

  res.status(200).json({
    success: true,
    items: rows.map((row) => toTechStackItemDto(row)),
  });
}

function parseResolveNames(body: unknown): string[] | null {
  if (!body || typeof body !== 'object') return null;
  const raw = (body as { names?: unknown }).names;
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, PAGINATION.reference.resolveMaxNames);
}

/** POST body: `{ names: string[] }` — enrich badge/suggestion rows with iconSlug + iconUrl. */
export async function resolveTechStackReference(req: Request, res: Response): Promise<void> {
  const names = parseResolveNames(req.body);
  if (names === null) {
    res.status(400).json({ success: false, message: 'names must be an array of strings' });
    return;
  }

  if (names.length === 0) {
    res.status(200).json({ success: true, items: [] satisfies TechStackItemDto[] });
    return;
  }

  const items = await resolveTechStackNames(names);
  res.status(200).json({ success: true, items });
}
