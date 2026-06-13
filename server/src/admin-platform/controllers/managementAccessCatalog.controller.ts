import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AdminResourceModel } from '../rbac/models/AdminResource.js';
import { AdminActionTypeModel } from '../rbac/models/AdminActionType.js';
import { AdminScopeTypeModel } from '../rbac/models/AdminScopeType.js';
import { AdminAccessPermissionModel } from '../rbac/models/AdminAccessPermission.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';
import { invalidateAllStaffAdminPermissionCaches } from '../rbac/services/rbac.service.js';
import { reserveUniqueSlug } from '../../shared/slug/slugifyDisplayName.js';

const SLUG_RE = /^[a-z][a-z0-9_]{0,79}$/;
const CATALOG_SLUG_MAX = 80;

async function resolveCatalogSlug(
  displayName: string,
  provided: string | undefined,
  exists: (slug: string) => Promise<boolean>
): Promise<string | null> {
  const manual = provided?.trim().toLowerCase();
  if (manual) {
    if (!SLUG_RE.test(manual)) return null;
    return manual;
  }
  return reserveUniqueSlug(displayName, exists, { maxLen: CATALOG_SLUG_MAX, style: 'underscore' });
}

function includeDeleted(req: Request): boolean {
  const v = req.query.includeDeleted;
  return v === '1' || v === 'true';
}

function activeFilter(req: Request): Record<string, unknown> {
  if (includeDeleted(req)) return {};
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function actorId(req: StaffManagementRequest): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(req.user._id);
}

export function buildPermissionKey(resource: string, action: string, typeSlug: string): string {
  const t = typeSlug.trim().toLowerCase() || 'management';
  if (t === 'management') return `${resource.trim().toLowerCase()}:${action.trim().toLowerCase()}`;
  return `${resource.trim().toLowerCase()}:${action.trim().toLowerCase()}:${t}`;
}

// ——— Resources ———

export async function getAccessResources(req: Request, res: Response): Promise<void> {
  const q = activeFilter(req);
  const rows = await AdminResourceModel.find(q).sort({ sortOrder: 1, slug: 1 }).lean();
  sendAdminOk(res, {
    items: rows.map((r) => ({
      id: String(r._id),
      slug: r.slug,
      displayName: r.displayName,
      description: r.description ?? null,
      sortOrder: r.sortOrder,
      deletedAt: r.deletedAt?.toISOString?.() ?? null,
    })),
  });
}

export async function postAccessResource(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    slug?: string;
    displayName?: string;
    description?: string;
    sortOrder?: number;
  };
  const displayName = body.displayName?.trim();
  if (!displayName) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'displayName is required');
    return;
  }
  const slug = await resolveCatalogSlug(displayName, body.slug, async (s) =>
    Boolean(await AdminResourceModel.findOne({ slug: s, deletedAt: null }).lean())
  );
  if (!slug) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Could not generate a valid slug');
    return;
  }
  const exists = await AdminResourceModel.findOne({ slug, deletedAt: null }).lean();
  if (exists) {
    sendAdminError(res, 409, 'CONFLICT', 'Resource slug already exists');
    return;
  }
  const doc = await AdminResourceModel.create({
    slug,
    displayName,
    description: body.description?.trim(),
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
  });
  sendAdminOk(res, { id: String(doc._id) });
}

export async function patchAccessResource(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const body = req.body as {
    displayName?: string;
    description?: string | null;
    sortOrder?: number;
  };
  const doc = await AdminResourceModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  if (body.displayName !== undefined) doc.displayName = body.displayName.trim() || doc.displayName;
  if (body.description !== undefined) doc.description = body.description?.trim() ?? undefined;
  if (typeof body.sortOrder === 'number') doc.sortOrder = body.sortOrder;
  await doc.save();
  sendAdminOk(res, { ok: true });
}

export async function deleteAccessResourceSoft(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminResourceModel.findById(id);
  if (!doc || doc.deletedAt) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  doc.deletedAt = new Date();
  doc.deletedById = actorId(actor);
  await doc.save();
  sendAdminOk(res, { ok: true });
}

export async function postAccessResourceRestore(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminResourceModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  const clash = await AdminResourceModel.findOne({
    slug: doc.slug,
    deletedAt: null,
    _id: { $ne: doc._id },
  }).lean();
  if (clash) {
    sendAdminError(res, 409, 'CONFLICT', 'Another active resource uses this slug');
    return;
  }
  doc.deletedAt = null;
  doc.deletedById = null;
  await doc.save();
  sendAdminOk(res, { ok: true });
}

// ——— Action types ———

export async function getAccessActions(req: Request, res: Response): Promise<void> {
  const q = activeFilter(req);
  const rows = await AdminActionTypeModel.find(q).sort({ sortOrder: 1, slug: 1 }).lean();
  sendAdminOk(res, {
    items: rows.map((r) => ({
      id: String(r._id),
      slug: r.slug,
      displayName: r.displayName,
      description: r.description ?? null,
      sortOrder: r.sortOrder,
      deletedAt: r.deletedAt?.toISOString?.() ?? null,
    })),
  });
}

export async function postAccessAction(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    slug?: string;
    displayName?: string;
    description?: string;
    sortOrder?: number;
  };
  const displayName = body.displayName?.trim();
  if (!displayName) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'displayName is required');
    return;
  }
  const slug = await resolveCatalogSlug(displayName, body.slug, async (s) =>
    Boolean(await AdminActionTypeModel.findOne({ slug: s, deletedAt: null }).lean())
  );
  if (!slug) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Could not generate a valid slug');
    return;
  }
  const exists = await AdminActionTypeModel.findOne({ slug, deletedAt: null }).lean();
  if (exists) {
    sendAdminError(res, 409, 'CONFLICT', 'Action slug already exists');
    return;
  }
  const doc = await AdminActionTypeModel.create({
    slug,
    displayName,
    description: body.description?.trim(),
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
  });
  sendAdminOk(res, { id: String(doc._id) });
}

export async function patchAccessAction(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const body = req.body as {
    displayName?: string;
    description?: string | null;
    sortOrder?: number;
  };
  const doc = await AdminActionTypeModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  if (body.displayName !== undefined) doc.displayName = body.displayName.trim() || doc.displayName;
  if (body.description !== undefined) doc.description = body.description?.trim() ?? undefined;
  if (typeof body.sortOrder === 'number') doc.sortOrder = body.sortOrder;
  await doc.save();
  sendAdminOk(res, { ok: true });
}

export async function deleteAccessActionSoft(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminActionTypeModel.findById(id);
  if (!doc || doc.deletedAt) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  doc.deletedAt = new Date();
  doc.deletedById = actorId(actor);
  await doc.save();
  sendAdminOk(res, { ok: true });
}

export async function postAccessActionRestore(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminActionTypeModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  const clash = await AdminActionTypeModel.findOne({
    slug: doc.slug,
    deletedAt: null,
    _id: { $ne: doc._id },
  }).lean();
  if (clash) {
    sendAdminError(res, 409, 'CONFLICT', 'Another active action uses this slug');
    return;
  }
  doc.deletedAt = null;
  doc.deletedById = null;
  await doc.save();
  sendAdminOk(res, { ok: true });
}

// ——— Scope types ———

export async function getAccessScopeTypes(req: Request, res: Response): Promise<void> {
  const q = activeFilter(req);
  const rows = await AdminScopeTypeModel.find(q).sort({ sortOrder: 1, slug: 1 }).lean();
  sendAdminOk(res, {
    items: rows.map((r) => ({
      id: String(r._id),
      slug: r.slug,
      displayName: r.displayName,
      description: r.description ?? null,
      sortOrder: r.sortOrder,
      deletedAt: r.deletedAt?.toISOString?.() ?? null,
    })),
  });
}

export async function postAccessScopeType(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    slug?: string;
    displayName?: string;
    description?: string;
    sortOrder?: number;
  };
  const displayName = body.displayName?.trim();
  if (!displayName) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'displayName is required');
    return;
  }
  const slug = await resolveCatalogSlug(displayName, body.slug, async (s) =>
    Boolean(await AdminScopeTypeModel.findOne({ slug: s, deletedAt: null }).lean())
  );
  if (!slug) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Could not generate a valid slug');
    return;
  }
  const exists = await AdminScopeTypeModel.findOne({ slug, deletedAt: null }).lean();
  if (exists) {
    sendAdminError(res, 409, 'CONFLICT', 'Scope slug already exists');
    return;
  }
  const doc = await AdminScopeTypeModel.create({
    slug,
    displayName,
    description: body.description?.trim(),
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
  });
  sendAdminOk(res, { id: String(doc._id) });
}

export async function patchAccessScopeType(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const body = req.body as {
    displayName?: string;
    description?: string | null;
    sortOrder?: number;
  };
  const doc = await AdminScopeTypeModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  if (body.displayName !== undefined) doc.displayName = body.displayName.trim() || doc.displayName;
  if (body.description !== undefined) doc.description = body.description?.trim() ?? undefined;
  if (typeof body.sortOrder === 'number') doc.sortOrder = body.sortOrder;
  await doc.save();
  sendAdminOk(res, { ok: true });
}

export async function deleteAccessScopeTypeSoft(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminScopeTypeModel.findById(id);
  if (!doc || doc.deletedAt) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  doc.deletedAt = new Date();
  doc.deletedById = actorId(actor);
  await doc.save();
  sendAdminOk(res, { ok: true });
}

export async function postAccessScopeTypeRestore(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminScopeTypeModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  const clash = await AdminScopeTypeModel.findOne({
    slug: doc.slug,
    deletedAt: null,
    _id: { $ne: doc._id },
  }).lean();
  if (clash) {
    sendAdminError(res, 409, 'CONFLICT', 'Another active scope uses this slug');
    return;
  }
  doc.deletedAt = null;
  doc.deletedById = null;
  await doc.save();
  sendAdminOk(res, { ok: true });
}

// ——— Permission rows ———

export async function getAccessPermissions(req: Request, res: Response): Promise<void> {
  const q = activeFilter(req);
  const rows = await AdminAccessPermissionModel.find(q).sort({ sortOrder: 1, key: 1 }).lean();
  sendAdminOk(res, {
    items: rows.map((r) => ({
      id: String(r._id),
      key: r.key,
      resource: r.resource,
      action: r.action,
      type: r.type,
      description: r.description ?? null,
      sortOrder: r.sortOrder,
      deletedAt: r.deletedAt?.toISOString?.() ?? null,
    })),
  });
}

export async function postAccessPermission(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    resource?: string;
    action?: string;
    type?: string;
    description?: string;
    sortOrder?: number;
  };
  const resource = body.resource?.trim().toLowerCase();
  const action = body.action?.trim().toLowerCase();
  const typeSlug = (body.type ?? 'management').trim().toLowerCase();
  if (!resource || !SLUG_RE.test(resource) || !action || !SLUG_RE.test(action)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Valid resource and action slugs are required');
    return;
  }
  const resDoc = await AdminResourceModel.findOne({ slug: resource, deletedAt: null }).lean();
  const actDoc = await AdminActionTypeModel.findOne({ slug: action, deletedAt: null }).lean();
  const scopeDoc = await AdminScopeTypeModel.findOne({ slug: typeSlug, deletedAt: null }).lean();
  if (!resDoc || !actDoc || !scopeDoc) {
    sendAdminError(
      res,
      400,
      'VALIDATION_ERROR',
      'Resource, action, and scope must exist and not be archived'
    );
    return;
  }
  const key = buildPermissionKey(resource, action, typeSlug);
  const clash = await AdminAccessPermissionModel.findOne({ key, deletedAt: null }).lean();
  if (clash) {
    sendAdminError(res, 409, 'CONFLICT', 'Permission key already exists');
    return;
  }
  const doc = await AdminAccessPermissionModel.create({
    key,
    resource,
    action,
    type: typeSlug,
    description: body.description?.trim(),
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
  });
  await invalidateAllStaffAdminPermissionCaches();
  sendAdminOk(res, { id: String(doc._id), key: doc.key });
}

export async function patchAccessPermission(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const body = req.body as { description?: string | null; sortOrder?: number };
  const doc = await AdminAccessPermissionModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  if (body.description !== undefined) doc.description = body.description?.trim() ?? undefined;
  if (typeof body.sortOrder === 'number') doc.sortOrder = body.sortOrder;
  await doc.save();
  await invalidateAllStaffAdminPermissionCaches();
  sendAdminOk(res, { ok: true });
}

export async function deleteAccessPermissionSoft(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminAccessPermissionModel.findById(id);
  if (!doc || doc.deletedAt) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  doc.deletedAt = new Date();
  doc.deletedById = actorId(actor);
  await doc.save();
  await invalidateAllStaffAdminPermissionCaches();
  sendAdminOk(res, { ok: true });
}

export async function postAccessPermissionRestore(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminAccessPermissionModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }
  const clash = await AdminAccessPermissionModel.findOne({
    key: doc.key,
    deletedAt: null,
    _id: { $ne: doc._id },
  }).lean();
  if (clash) {
    sendAdminError(res, 409, 'CONFLICT', 'Another active row uses this permission key');
    return;
  }
  doc.deletedAt = null;
  doc.deletedById = null;
  await doc.save();
  await invalidateAllStaffAdminPermissionCaches();
  sendAdminOk(res, { ok: true });
}
