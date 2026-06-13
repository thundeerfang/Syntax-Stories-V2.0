import type { Request, Response } from 'express';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import {
  bulkCreateAdminBlogCategories,
  bulkCreateAdminBlogTags,
  createAdminBlogCategory,
  createAdminBlogTag,
  type BulkCategoryInput,
  type BulkTagInput,
  listAdminBlogCategories,
  listAdminBlogTags,
  loadAdminBlogCategory,
  loadAdminBlogTag,
  patchAdminBlogCategory,
  patchAdminBlogTag,
} from './managementBlogTaxonomy.service.js';

function sortParam(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  return v.length ? v : undefined;
}

function qParam(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().slice(0, 120);
  return v.length ? v : undefined;
}

export async function listBlogCategories(req: Request, res: Response): Promise<void> {
  const data = await listAdminBlogCategories({
    q: qParam(req.query.q),
    sort: sortParam(req.query.sort),
  });
  sendAdminOk(res, data);
}

export async function getBlogCategoryByRef(req: Request, res: Response): Promise<void> {
  const ref = typeof req.params.ref === 'string' ? req.params.ref.trim() : '';
  if (!ref) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Category ref required');
    return;
  }
  const data = await loadAdminBlogCategory(ref);
  if (!data) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Category not found');
    return;
  }
  sendAdminOk(res, data);
}

export async function postBlogCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    slug?: string;
    name?: string;
    description?: string;
    sortOrder?: number;
  };
  const result = await createAdminBlogCategory(body);
  if ('error' in result) {
    const http = result.error === 'CONFLICT' ? 409 : 400;
    const code = result.error === 'CONFLICT' ? 'CONFLICT' : 'VALIDATION_ERROR';
    sendAdminError(res, http, code, result.message ?? 'Invalid request');
    return;
  }
  sendAdminOk(res, result.item);
}

export async function postBlogCategoryBulk(req: Request, res: Response): Promise<void> {
  const body = req.body as { items?: BulkCategoryInput[] };
  const items = Array.isArray(body.items) ? body.items : [];
  const result = await bulkCreateAdminBlogCategories(items);
  if ('error' in result) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', result.message ?? 'Invalid request');
    return;
  }
  sendAdminOk(res, result);
}

export async function patchBlogCategory(req: Request, res: Response): Promise<void> {
  const ref = typeof req.params.ref === 'string' ? req.params.ref.trim() : '';
  if (!ref) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Category ref required');
    return;
  }
  const body = req.body as {
    name?: string;
    description?: string | null;
    sortOrder?: number;
  };
  const data = await patchAdminBlogCategory(ref, body);
  if (!data) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Category not found');
    return;
  }
  sendAdminOk(res, data);
}

export async function listBlogTags(req: Request, res: Response): Promise<void> {
  const data = await listAdminBlogTags({
    q: qParam(req.query.q),
    sort: sortParam(req.query.sort),
  });
  sendAdminOk(res, data);
}

export async function getBlogTagByRef(req: Request, res: Response): Promise<void> {
  const ref = typeof req.params.ref === 'string' ? req.params.ref.trim() : '';
  if (!ref) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Tag ref required');
    return;
  }
  const data = await loadAdminBlogTag(ref);
  if (!data) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Tag not found');
    return;
  }
  sendAdminOk(res, data);
}

export async function postBlogTag(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    slug?: string;
    name?: string;
    description?: string;
    sortOrder?: number;
  };
  const result = await createAdminBlogTag(body);
  if ('error' in result) {
    const http = result.error === 'CONFLICT' ? 409 : 400;
    const code = result.error === 'CONFLICT' ? 'CONFLICT' : 'VALIDATION_ERROR';
    sendAdminError(res, http, code, result.message ?? 'Invalid request');
    return;
  }
  sendAdminOk(res, result.item);
}

export async function postBlogTagBulk(req: Request, res: Response): Promise<void> {
  const body = req.body as { items?: BulkTagInput[] };
  const items = Array.isArray(body.items) ? body.items : [];
  const result = await bulkCreateAdminBlogTags(items);
  if ('error' in result) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', result.message ?? 'Invalid request');
    return;
  }
  sendAdminOk(res, result);
}

export async function patchBlogTag(req: Request, res: Response): Promise<void> {
  const ref = typeof req.params.ref === 'string' ? req.params.ref.trim() : '';
  if (!ref) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Tag ref required');
    return;
  }
  const body = req.body as {
    name?: string;
    description?: string | null;
    sortOrder?: number;
  };
  const data = await patchAdminBlogTag(ref, body);
  if (!data) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Tag not found');
    return;
  }
  sendAdminOk(res, data);
}
