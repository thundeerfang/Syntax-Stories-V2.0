import type { Request, Response } from 'express';
import { ReferenceEntityModel, type ReferenceEntityKind } from '../models/ReferenceEntity.js';
import { TechStackReferenceModel } from '../models/TechStackReference.js';

const ENTITY_KINDS = new Set<ReferenceEntityKind>(['company', 'school', 'organization']);
const DEFAULT_LIMIT = 15;

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
  const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), 30);

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
  const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), 30);

  if (!q) {
    res.status(200).json({ success: true, items: [] });
    return;
  }

  const rx = new RegExp(escapeRegex(q), 'i');
  const rows = await TechStackReferenceModel.find({
    $or: [{ name: rx }, { slug: rx }],
  })
    .sort({ name: 1 })
    .limit(limit)
    .select({ name: 1, slug: 1, category: 1, _id: 0 })
    .lean();

  res.status(200).json({ success: true, items: rows });
}
