import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ContactLeadModel } from '../../models/ContactLead.js';
import { adminUserRefFromObjectId } from '../iam/adminUserRef.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';

const MAX_LIMIT = 100;

export async function listContactLeads(req: Request, res: Response): Promise<void> {
  const rawLimit = Number(req.query.limit);
  const limit = Math.min(
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 25,
    MAX_LIMIT
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

  const filter: Record<string, unknown> = {};
  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const rows = await ContactLeadModel.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select('fullName email company topic createdAt userId username')
    .lean();

  const slice = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? String(slice[slice.length - 1]!._id) : null;

  sendAdminOk(res, {
    items: slice.map((r) => ({
      id: String(r._id),
      fullName: r.fullName,
      email: r.email,
      company: r.company ?? null,
      topic: r.topic,
      createdAt: r.createdAt?.toISOString?.() ?? null,
      userId: r.userId ? String(r.userId) : null,
      userRef: adminUserRefFromObjectId(r.userId ? String(r.userId) : null),
      username: r.username ?? null,
    })),
    nextCursor,
  });
}

export async function getContactLeadById(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }

  const doc = await ContactLeadModel.findById(id).lean();
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Contact lead not found');
    return;
  }

  sendAdminOk(res, {
    lead: {
      id: String(doc._id),
      fullName: doc.fullName,
      email: doc.email,
      company: doc.company ?? null,
      topic: doc.topic,
      message: doc.message,
      userId: doc.userId ? String(doc.userId) : null,
      userRef: adminUserRefFromObjectId(doc.userId ? String(doc.userId) : null),
      username: doc.username ?? null,
      clientMeta: doc.clientMeta ?? null,
      serverMeta: doc.serverMeta,
      createdAt: doc.createdAt?.toISOString?.() ?? null,
      updatedAt: doc.updatedAt?.toISOString?.() ?? null,
    },
  });
}
