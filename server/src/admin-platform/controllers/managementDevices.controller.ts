import type { Request, Response } from 'express';
import {
  listTrustedDevices,
  revokeTrustedDevice,
  trustDeviceForUser,
} from '../iam/deviceBinding.service.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';
import { writeAuditLog } from '../../shared/audit/auditLog.js';
import { AuditAction } from '../../shared/audit/events.js';

export async function listMyTrustedDevices(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const items = await listTrustedDevices(actor.user._id);
  sendAdminOk(res, {
    devices: items.map((d) => ({
      id: String(d._id),
      deviceFingerprint: d.deviceFingerprint,
      deviceName: d.deviceName,
      ip: d.ip ?? null,
      trustedAt: d.trustedAt?.toISOString?.() ?? null,
      lastSeenAt: d.lastSeenAt?.toISOString?.() ?? null,
    })),
  });
}

export async function postTrustCurrentDevice(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  await trustDeviceForUser(actor.user._id, req);
  void writeAuditLog(req, AuditAction.ADMIN_DEVICE_TRUSTED, {
    actorId: actor.user._id,
    metadata: {},
  });
  sendAdminOk(res, { trusted: true });
}

export async function deleteTrustedDevice(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const deviceId = String((req.params as { deviceId?: string }).deviceId ?? '');
  if (!deviceId) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'deviceId required');
    return;
  }
  const ok = await revokeTrustedDevice(actor.user._id, deviceId);
  if (!ok) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Device not found');
    return;
  }
  sendAdminOk(res, { revoked: true });
}
