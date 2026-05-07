import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LegalIdempotencyKeyModel } from './models/legal.models.js';
import { hashIdempotencyPayload } from './legalContentHash.js';

function getKey(req: Request): string | undefined {
  const k = req.get('Idempotency-Key') ?? req.get('X-Idempotency-Key');
  return k && k.length <= 256 ? k : undefined;
}

export async function tryLegalIdempotencyRead(
  req: Request,
  route: string,
  _actorUserId: string | undefined,
  body: unknown
): Promise<{ replay: true; status: number; body: unknown } | { replay: false; conflict: true } | null> {
  const key = getKey(req);
  if (!key) return null;
  const requestHash = hashIdempotencyPayload(body ?? {});
  const existing = await LegalIdempotencyKeyModel.findOne({ key, route })
    .lean()
    .exec() as {
    requestHash?: string;
    responseStatus?: number;
    responseBody?: string;
  } | null;
  if (!existing) return null;
  if (existing.requestHash !== requestHash) {
    return { replay: false, conflict: true };
  }
  const st = existing.responseStatus ?? 200;
  const raw = existing.responseBody ?? '{}';
  try {
    return { replay: true, status: st, body: JSON.parse(raw) as unknown };
  } catch {
    return { replay: true, status: st, body: { ok: false, message: 'Stored response parse error' } };
  }
}

export async function storeLegalIdempotency(
  key: string,
  route: string,
  actorUserId: string | undefined,
  body: unknown,
  responseStatus: number,
  responseBody: unknown
): Promise<void> {
  const requestHash = hashIdempotencyPayload(body ?? {});
  const actor = actorUserId ? new mongoose.Types.ObjectId(actorUserId) : undefined;
  try {
    await LegalIdempotencyKeyModel.create({
      key,
      route,
      actorUserId: actor,
      requestHash,
      responseStatus,
      responseBody: JSON.stringify(responseBody),
    });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11_000) return;
    throw e;
  }
}

export function sendIdempotencyConflict(res: Response): void {
  res.status(409).json({
    ok: false,
    code: 'IDEMPOTENCY_CONFLICT',
    message: 'Same Idempotency-Key was used with a different request body.',
  });
}

export function getIdempotencyKeyOrNull(req: Request): string | undefined {
  return getKey(req);
}

export async function completeWithIdempotency(
  req: Request,
  res: Response,
  route: string,
  actorUserId: string | undefined,
  requestBody: unknown,
  run: () => Promise<{ status: number; body: unknown }>
): Promise<void> {
  const key = getKey(req);
  const early = await tryLegalIdempotencyRead(req, route, actorUserId, requestBody);
  if (early?.replay === false && early.conflict) {
    sendIdempotencyConflict(res);
    return;
  }
  if (early?.replay === true) {
    res.status(early.status).json(early.body);
    return;
  }
  const { status, body } = await run();
  res.status(status).json(body);
  if (key) {
    await storeLegalIdempotency(key, route, actorUserId, requestBody, status, body);
  }
}
