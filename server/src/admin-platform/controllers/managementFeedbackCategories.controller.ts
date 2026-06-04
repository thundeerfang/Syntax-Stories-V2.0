import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FeedbackCategoryModel } from '../../models/FeedbackCategory.js';
import { FeedbackSubmissionModel } from '../../models/FeedbackSubmission.js';
import { reserveUniqueSlug } from '../../shared/slug/slugifyDisplayName.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';

function actorLabel(_req: StaffManagementRequest): string {
  return 'admin';
}

function mapCategory(row: {
  _id: mongoose.Types.ObjectId;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
  createdAtIst: string;
  updatedAtIst: string;
}) {
  return {
    id: String(row._id),
    slug: row.slug,
    label: row.label,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAtIst: row.createdAtIst,
    updatedAtIst: row.updatedAtIst,
  };
}

export async function listFeedbackCategoriesAdmin(req: Request, res: Response): Promise<void> {
  const rows = await FeedbackCategoryModel.find({})
    .sort({ sortOrder: 1, label: 1 })
    .lean();
  sendAdminOk(res, { items: rows.map((r) => mapCategory(r as Parameters<typeof mapCategory>[0])) });
}

export async function postFeedbackCategory(req: Request, res: Response): Promise<void> {
  const mgmt = req as StaffManagementRequest;
  const body = req.body as { label?: string; sortOrder?: number };
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label || label.length > 120) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Label is required (max 120 characters).');
    return;
  }

  const slug = await reserveUniqueSlug(
    label,
    async (s) => Boolean(await FeedbackCategoryModel.exists({ slug: s })),
    { maxLen: 64, style: 'hyphen' }
  );
  if (!slug) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Could not generate a valid slug from label.');
    return;
  }

  const sortOrder =
    typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)
      ? Math.floor(body.sortOrder)
      : 0;

  try {
    const doc = await FeedbackCategoryModel.create({
      slug,
      label,
      sortOrder,
      active: true,
      isSystemSeed: false,
      createdByUserId: new mongoose.Types.ObjectId(mgmt.user._id),
      updatedByUserId: new mongoose.Types.ObjectId(mgmt.user._id),
      createdByLabel: actorLabel(mgmt),
      updatedByLabel: actorLabel(mgmt),
    });
    sendAdminOk(res, { item: mapCategory(doc) });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      sendAdminError(res, 409, 'CONFLICT', 'A category with this slug already exists.');
      return;
    }
    throw e;
  }
}

export async function patchFeedbackCategory(req: Request, res: Response): Promise<void> {
  const mgmt = req as StaffManagementRequest;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid category id');
    return;
  }

  const body = req.body as { label?: string; sortOrder?: number; active?: boolean };
  const patch: Record<string, unknown> = {
    updatedByUserId: new mongoose.Types.ObjectId(mgmt.user._id),
    updatedByLabel: actorLabel(mgmt),
  };

  if (body.label !== undefined) {
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label || label.length > 120) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'Label must be 1–120 characters.');
      return;
    }
    patch.label = label;
  }
  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== 'number' || !Number.isFinite(body.sortOrder)) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'sortOrder must be a number');
      return;
    }
    patch.sortOrder = Math.floor(body.sortOrder);
  }
  if (body.active !== undefined) {
    patch.active = Boolean(body.active);
  }

  const doc = await FeedbackCategoryModel.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true }
  ).lean();
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Category not found');
    return;
  }
  sendAdminOk(res, { item: mapCategory(doc as Parameters<typeof mapCategory>[0]) });
}

export async function deleteFeedbackCategory(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid category id');
    return;
  }

  const used = await FeedbackSubmissionModel.countDocuments({ categoryId: id });
  if (used > 0) {
    await FeedbackCategoryModel.findByIdAndUpdate(id, {
      $set: { active: false },
    });
    sendAdminOk(res, { id, deactivated: true, submissionCount: used });
    return;
  }

  const removed = await FeedbackCategoryModel.findByIdAndDelete(id);
  if (!removed) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Category not found');
    return;
  }
  sendAdminOk(res, { id, deleted: true });
}
