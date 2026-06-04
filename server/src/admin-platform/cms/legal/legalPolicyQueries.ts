import mongoose from 'mongoose';
import type { LegalKind } from './legalKinds.js';
import {
  LegalPolicyModel,
  LegalPolicyRevisionModel,
  UserLegalAcceptanceModel,
  type LegalPolicyDoc,
  type LegalPolicyRevisionDoc,
} from './models/legal.models.js';
import { getLegalDbNow } from './legalDbTime.js';

const DEFAULT_REGION = 'global' as const;
const DEFAULT_LOCALE = 'en';

export async function findWorkingPolicy(
  kind: LegalKind,
  region = DEFAULT_REGION,
  locale = DEFAULT_LOCALE
): Promise<LegalPolicyDoc | null> {
  return LegalPolicyModel.findOne({
    kind,
    region,
    locale,
    deletedAt: null,
    tenantId: null,
    productId: null,
  }).exec();
}

/** Revision users are legally bound to for public read (§38 — prior until effectiveAt). */
export async function getDisplayRevisionForPolicy(
  policy: LegalPolicyDoc,
  now: Date
): Promise<LegalPolicyRevisionDoc | null> {
  if (!policy.publishedRevisionId) return null;
  const current = await LegalPolicyRevisionModel.findOne({
    revisionId: policy.publishedRevisionId,
  }).exec();
  if (!current) return null;
  if (current.effectiveAt && current.effectiveAt > now) {
    const prior = await LegalPolicyRevisionModel.findOne({
      policyId: policy._id,
      version: current.version - 1,
    }).exec();
    if (prior && (prior.status === 'published' || prior.status === 'superseded')) {
      return prior;
    }
  }
  return current;
}

export async function getPublishedPolicyResponse(kind: LegalKind): Promise<{
  policy: LegalPolicyDoc;
  revision: LegalPolicyRevisionDoc;
} | null> {
  const policy = await findWorkingPolicy(kind);
  if (!policy || policy.status !== 'published') return null;
  const now = await getLegalDbNow();
  const revision = await getDisplayRevisionForPolicy(policy, now);
  if (!revision) return null;
  return { policy, revision };
}

export async function getRequiredVersionsForUser(
  userId: string,
  now: Date
): Promise<{
  terms: { acceptedVersion: number; requiredVersion: number; mustReaccept: boolean };
  privacy: { acceptedVersion: number; requiredVersion: number; mustReaccept: boolean };
}> {
  const termsPolicy = await findWorkingPolicy('terms');
  const privacyPolicy = await findWorkingPolicy('privacy');

  async function requiredVersionFor(kind: 'terms' | 'privacy'): Promise<number> {
    const p = kind === 'terms' ? termsPolicy : privacyPolicy;
    if (!p || p.status !== 'published' || !p.publishedRevisionId) return 0;
    const rev = await getDisplayRevisionForPolicy(p, now);
    return rev?.version ?? 0;
  }

  async function acceptedMax(kind: 'terms' | 'privacy'): Promise<number> {
    const oid = new mongoose.Types.ObjectId(userId);
    const row = await UserLegalAcceptanceModel.findOne({ userId: oid, policyKind: kind })
      .sort({ version: -1 })
      .select('version')
      .lean();
    return row?.version ?? 0;
  }

  const [reqT, reqP, accT, accP] = await Promise.all([
    requiredVersionFor('terms'),
    requiredVersionFor('privacy'),
    acceptedMax('terms'),
    acceptedMax('privacy'),
  ]);

  return {
    terms: {
      acceptedVersion: accT,
      requiredVersion: reqT,
      mustReaccept: reqT > 0 && accT < reqT,
    },
    privacy: {
      acceptedVersion: accP,
      requiredVersion: reqP,
      mustReaccept: reqP > 0 && accP < reqP,
    },
  };
}

export async function hasAnyMustReaccept(userId: string): Promise<boolean> {
  const now = await getLegalDbNow();
  const s = await getRequiredVersionsForUser(userId, now);
  return s.terms.mustReaccept || s.privacy.mustReaccept;
}
