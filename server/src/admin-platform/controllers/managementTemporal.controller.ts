import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import {
  createTemporalGrant,
  listTemporalGrantsForUser,
  revokeTemporalGrant,
} from '../iam/temporal/temporalGrant.service.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';
import { writeAuditLog } from '../../shared/audit/auditLog.js';
import { AuditAction } from '../../shared/audit/events.js';
import { incrementIamMetric } from '../iam/iamMetrics.service.js';

export async function listElevations(req: Request, res: Response): Promise<void> {
  if (!env.FEATURE_ADMIN_TEMPORAL_PERMISSIONS) {
    sendAdminError(res, 503, 'FEATURE_DISABLED', 'Temporal permissions are not enabled.');
    return;
  }
  const actor = req as StaffManagementRequest;
  const includeExpired = req.query.includeExpired === '1';
  const targetUserId =
    typeof req.query.userId === 'string' && mongoose.isValidObjectId(req.query.userId)
      ? req.query.userId
      : actor.user._id;

  const grants = await listTemporalGrantsForUser(targetUserId, includeExpired);
  sendAdminOk(res, {
    items: grants.map((g) => ({
      id: String(g._id),
      userId: String(g.userId),
      grantedById: String(g.grantedById),
      permissions: g.permissions ?? [],
      reason: g.reason ?? null,
      startsAt: g.startsAt?.toISOString?.() ?? null,
      expiresAt: g.expiresAt?.toISOString?.() ?? null,
      revokedAt: g.revokedAt?.toISOString?.() ?? null,
    })),
  });
}

export async function postElevation(req: Request, res: Response): Promise<void> {
  if (!env.FEATURE_ADMIN_TEMPORAL_PERMISSIONS) {
    sendAdminError(res, 503, 'FEATURE_DISABLED', 'Temporal permissions are not enabled.');
    return;
  }
  const actor = req as StaffManagementRequest;
  const body = req.body as {
    userId?: string;
    permissions?: string[];
    reason?: string;
    durationMinutes?: number;
  };

  const userId = body.userId?.trim() || actor.user._id;
  if (!mongoose.isValidObjectId(userId)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid userId');
    return;
  }
  if (!Array.isArray(body.permissions) || body.permissions.length === 0) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'permissions[] required');
    return;
  }

  try {
    const created = await createTemporalGrant({
      userId,
      grantedById: actor.user._id,
      permissions: body.permissions,
      reason: body.reason,
      durationMinutes: body.durationMinutes,
    });
    void incrementIamMetric('elevation_granted');
    void writeAuditLog(req, AuditAction.ADMIN_ELEVATION_GRANTED, {
      actorId: actor.user._id,
      targetType: 'user',
      targetId: userId,
      metadata: {
        grantId: created.id,
        permissions: body.permissions,
        expiresAt: created.expiresAt.toISOString(),
      },
    });
    sendAdminOk(res, {
      id: created.id,
      expiresAt: created.expiresAt.toISOString(),
    });
  } catch (e) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid grant');
  }
}

export async function deleteElevation(req: Request, res: Response): Promise<void> {
  if (!env.FEATURE_ADMIN_TEMPORAL_PERMISSIONS) {
    sendAdminError(res, 503, 'FEATURE_DISABLED', 'Temporal permissions are not enabled.');
    return;
  }
  const actor = req as StaffManagementRequest;
  const grantId = String((req.params as { id?: string }).id ?? '');
  const userId =
    typeof req.query.userId === 'string' && mongoose.isValidObjectId(req.query.userId)
      ? req.query.userId
      : actor.user._id;

  if (!mongoose.isValidObjectId(grantId)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid grant id');
    return;
  }

  const ok = await revokeTemporalGrant(grantId, userId);
  if (!ok) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Grant not found');
    return;
  }
  void writeAuditLog(req, AuditAction.ADMIN_ELEVATION_REVOKED, {
    actorId: actor.user._id,
    targetType: 'user',
    targetId: userId,
    metadata: { grantId },
  });
  sendAdminOk(res, { revoked: true });
}
