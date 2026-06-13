import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FeedbackSubmissionModel } from '../../models/FeedbackSubmission.js';
import { adminUserRefFromObjectId } from '../iam/adminUserRef.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import { parseAdminListLimit } from '../../shared/http/pagination.js';

export async function listFeedbackSubmissions(req: Request, res: Response): Promise<void> {
  const limit = parseAdminListLimit(req.query.limit);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

  const filter: Record<string, unknown> = {};
  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const rows = await FeedbackSubmissionModel.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select(
      'firstName lastName email subject categoryLabel categorySlug createdAt attachmentUrl userId username'
    )
    .lean();

  const slice = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? String(slice[slice.length - 1]!._id) : null;

  sendAdminOk(res, {
    items: slice.map((r) => ({
      id: String(r._id),
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      subject: r.subject,
      categoryLabel: r.categoryLabel,
      categorySlug: r.categorySlug,
      createdAt: r.createdAt?.toISOString?.() ?? null,
      hasAttachment: Boolean(r.attachmentUrl),
      userId: r.userId ? String(r.userId) : null,
      userRef: adminUserRefFromObjectId(r.userId ? String(r.userId) : null),
      username: r.username ?? null,
    })),
    nextCursor,
  });
}

export async function getFeedbackSubmissionById(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }

  const doc = await FeedbackSubmissionModel.findById(id).lean();
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Feedback not found');
    return;
  }

  sendAdminOk(res, {
    submission: {
      id: String(doc._id),
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      subject: doc.subject,
      description: doc.description,
      categoryId: String(doc.categoryId),
      categorySlug: doc.categorySlug,
      categoryLabel: doc.categoryLabel,
      userId: doc.userId ? String(doc.userId) : null,
      userRef: adminUserRefFromObjectId(doc.userId ? String(doc.userId) : null),
      username: doc.username ?? null,
      attachmentUrl: doc.attachmentUrl ?? null,
      attachmentTitle: doc.attachmentTitle ?? null,
      attachmentMeta: doc.attachmentMeta ?? null,
      clientMeta: doc.clientMeta ?? null,
      serverMeta: doc.serverMeta,
      emailDelivered: doc.emailDelivered,
      emailError: doc.emailError ?? null,
      createdAt: doc.createdAt?.toISOString?.() ?? null,
      updatedAt: doc.updatedAt?.toISOString?.() ?? null,
    },
  });
}
