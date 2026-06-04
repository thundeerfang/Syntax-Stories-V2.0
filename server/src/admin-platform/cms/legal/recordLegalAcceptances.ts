import type { Request } from 'express';
import mongoose from 'mongoose';
import { UserLegalAcceptanceModel } from './models/legal.models.js';
import { getPublishedPolicyResponse } from './legalPolicyQueries.js';
import { getLegalDbNow } from './legalDbTime.js';

type AcceptSource = 'signup' | 'api';

async function upsertAcceptance(
  userId: mongoose.Types.ObjectId,
  kind: 'terms' | 'privacy',
  opts: {
    source: AcceptSource;
    acknowledgementType?: 'checkbox' | 'implicit';
    req?: Pick<Request, 'ip' | 'get'>;
  }
): Promise<void> {
  const pub = await getPublishedPolicyResponse(kind);
  if (!pub) return;
  const rev = pub.revision;
  const now = await getLegalDbNow();
  try {
    await UserLegalAcceptanceModel.create({
      userId,
      policyKind: kind,
      version: rev.version,
      revisionId: rev.revisionId,
      contentHash: rev.contentHash,
      acknowledgementType: opts.acknowledgementType,
      acceptedAt: now,
      ipAddress: opts.req?.ip,
      userAgent: opts.req?.get?.('user-agent') ?? undefined,
      source: opts.source,
    });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11_000) return;
    throw e;
  }
}

/** After email/OAuth signup when the user checked the consent UI (or cookie for OAuth). */
export async function recordSignupLegalAcceptances(
  userId: mongoose.Types.ObjectId,
  req: Pick<Request, 'ip' | 'get'>
): Promise<void> {
  await upsertAcceptance(userId, 'terms', {
    source: 'signup',
    acknowledgementType: 'checkbox',
    req,
  });
  await upsertAcceptance(userId, 'privacy', {
    source: 'signup',
    acknowledgementType: 'checkbox',
    req,
  });
}

/** Bootstrap server users (e.g. CMS admin) so strict legal middleware does not block before first login. */
export async function recordBootstrapLegalAcceptances(
  userId: mongoose.Types.ObjectId
): Promise<void> {
  await upsertAcceptance(userId, 'terms', { source: 'api', acknowledgementType: 'implicit' });
  await upsertAcceptance(userId, 'privacy', { source: 'api', acknowledgementType: 'implicit' });
}
