import type { Request } from 'express';
import { env } from '../../config/env.js';
import { computeDeviceFingerprint } from '../../services/session.service.js';
import { TrustedDeviceModel } from './models/TrustedDevice.js';
import { incrementIamMetric } from './iamMetrics.service.js';

function clientMeta(req: Request): { ip: string; userAgent: string; fingerprint: string } {
  const ip =
    req.ip ??
    req.socket?.remoteAddress ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    'unknown';
  const userAgent = req.get('User-Agent') ?? '';
  return { ip, userAgent, fingerprint: computeDeviceFingerprint(ip, userAgent) };
}

export async function isDeviceTrusted(userId: string, fingerprint: string): Promise<boolean> {
  const doc = await TrustedDeviceModel.findOne({
    userId,
    deviceFingerprint: fingerprint,
    revokedAt: null,
  })
    .select('_id')
    .lean();
  return Boolean(doc);
}

export async function trustDeviceForUser(
  userId: string,
  req: Request,
  deviceName?: string
): Promise<void> {
  const { ip, userAgent, fingerprint } = clientMeta(req);
  await TrustedDeviceModel.updateOne(
    { userId, deviceFingerprint: fingerprint },
    {
      $set: {
        deviceName: deviceName ?? 'Trusted device',
        userAgent,
        ip,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
      $setOnInsert: { trustedAt: new Date() },
    },
    { upsert: true }
  );
}

export async function touchTrustedDevice(userId: string, fingerprint: string): Promise<void> {
  await TrustedDeviceModel.updateOne(
    { userId, deviceFingerprint: fingerprint, revokedAt: null },
    { $set: { lastSeenAt: new Date() } }
  );
}

export async function listTrustedDevices(userId: string) {
  return TrustedDeviceModel.find({ userId, revokedAt: null }).sort({ lastSeenAt: -1 }).lean();
}

export async function revokeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
  const res = await TrustedDeviceModel.updateOne(
    { _id: deviceId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return res.modifiedCount > 0;
}

/**
 * When device binding is enabled, refresh must match session fingerprint or a trusted device.
 */
export async function verifyDeviceBindingOnRefresh(
  userId: string,
  sessionFingerprint: string | undefined,
  req: Request
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!env.FEATURE_ADMIN_DEVICE_BINDING) return { ok: true };
  const { fingerprint } = clientMeta(req);
  if (!sessionFingerprint) return { ok: true };
  if (sessionFingerprint === fingerprint) {
    void touchTrustedDevice(userId, fingerprint);
    return { ok: true };
  }
  const trusted = await isDeviceTrusted(userId, fingerprint);
  if (trusted) {
    void touchTrustedDevice(userId, fingerprint);
    return { ok: true };
  }
  void incrementIamMetric('device_binding_denied');
  return { ok: false, reason: 'Unrecognized device. Sign in again from a trusted device.' };
}

export async function assertNewStaffDeviceAllowed(
  userId: string,
  req: Request
): Promise<{ ok: true; newDevice: boolean } | { ok: false; reason: string }> {
  if (!env.FEATURE_ADMIN_DEVICE_BINDING) return { ok: true, newDevice: false };
  const { fingerprint } = clientMeta(req);
  const trusted = await isDeviceTrusted(userId, fingerprint);
  if (trusted) return { ok: true, newDevice: false };
  const count = await TrustedDeviceModel.countDocuments({ userId, revokedAt: null });
  if (count === 0) {
    await trustDeviceForUser(userId, req);
    return { ok: true, newDevice: true };
  }
  void incrementIamMetric('device_binding_new_device');
  return {
    ok: false,
    reason: 'New device detected. Trust this device from Security settings after signing in.',
  };
}
