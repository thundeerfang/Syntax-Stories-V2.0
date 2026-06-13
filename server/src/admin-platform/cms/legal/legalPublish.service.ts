import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { getRedis } from '../../../config/redis.js';
import {
  LegalPolicyModel,
  LegalPolicyRevisionModel,
  type LegalPolicyDoc,
} from './models/legal.models.js';
import { computeLegalContentHash } from './legalContentHash.js';
import { getLegalDbNow } from './legalDbTime.js';
import { slugForKind, type LegalKind } from './legalKinds.js';
import { legalJobQueue } from './legalJobQueue.js';

const LOCK_TTL_SEC = 30;
const lockKey = (policyId: string) => `legal:publish:${policyId}`;

export async function acquirePublishLock(
  policyId: string
): Promise<{ release: () => Promise<void> } | null> {
  const token = crypto.randomBytes(16).toString('hex');
  const redis = getRedis();
  if (redis) {
    const ok = await redis.set(lockKey(policyId), token, { NX: true, EX: LOCK_TTL_SEC });
    if (ok !== 'OK') return null;
    return {
      release: async () => {
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          end
          return 0
        `;
        try {
          await redis.eval(script, { keys: [lockKey(policyId)], arguments: [token] });
        } catch {
          /* ignore */
        }
      },
    };
  }
  return { release: async () => {} };
}

export type PublishDraftInput = {
  title: string;
  summary: string;
  body: string;
  bodyFormat?: 'markdown' | 'mdx' | 'richtext';
  changeLog: string;
  isMajor: boolean;
  effectiveAt?: Date | null;
  contactEmail?: string;
  companyName?: string;
  companyAddress?: string;
  publishedById: mongoose.Types.ObjectId;
  expectedPublishedRevisionId?: string | null;
};

export async function publishPolicyRevision(params: {
  policy: LegalPolicyDoc;
  draft: PublishDraftInput;
}): Promise<
  | { ok: true; revisionId: string; publishTransactionId: string; version: number }
  | { ok: false; code: 'CAS_CONFLICT' | 'LOCK_NOT_ACQUIRED'; message: string }
> {
  const { policy, draft } = params;
  const lock = await acquirePublishLock(policy._id.toString());
  if (!lock) {
    return {
      ok: false,
      code: 'LOCK_NOT_ACQUIRED',
      message: 'Another publish is in progress for this policy.',
    };
  }

  const session = await mongoose.startSession();
  type PublishOk = { ok: true; revisionId: string; publishTransactionId: string; version: number };
  try {
    const publishOutcome = await session.withTransaction(async (): Promise<PublishOk | null> => {
      const fresh = await LegalPolicyModel.findById(policy._id).session(session).exec();
      if (!fresh) return null;

      const now = await getLegalDbNow();
      const publishTransactionId = crypto.randomUUID();
      const revisionId = crypto.randomUUID();
      const newVersion = (fresh.version ?? 1) + 1;
      const contentHash = computeLegalContentHash(draft.title, draft.summary, draft.body);

      const expected =
        draft.expectedPublishedRevisionId !== undefined
          ? draft.expectedPublishedRevisionId
          : (fresh.publishedRevisionId ?? null);
      const casFilter: Record<string, unknown> = {
        _id: fresh._id,
        deletedAt: null,
      };
      if (expected === null || expected === undefined) {
        casFilter.$or = [
          { publishedRevisionId: { $exists: false } },
          { publishedRevisionId: null },
        ];
      } else {
        casFilter.publishedRevisionId = expected;
      }

      const updated = await LegalPolicyModel.findOneAndUpdate(
        casFilter,
        {
          $set: {
            title: draft.title,
            summary: draft.summary,
            body: draft.body,
            bodyFormat: draft.bodyFormat ?? fresh.bodyFormat,
            status: 'published',
            publishedRevisionId: revisionId,
            publishedAt: now,
            version: newVersion,
            changeLog: draft.changeLog,
            isMajor: draft.isMajor,
            effectiveAt: draft.effectiveAt ?? undefined,
            contactEmail: draft.contactEmail ?? fresh.contactEmail,
            companyName: draft.companyName ?? fresh.companyName,
            companyAddress: draft.companyAddress ?? fresh.companyAddress,
          },
        },
        { new: true, session }
      ).exec();

      if (!updated) {
        return null;
      }

      await LegalPolicyRevisionModel.updateMany(
        { policyId: fresh._id, status: 'published' },
        { $set: { status: 'superseded' } },
        { session }
      );

      await LegalPolicyRevisionModel.create(
        [
          {
            revisionId,
            policyId: fresh._id,
            kind: fresh.kind as LegalKind,
            version: newVersion,
            title: draft.title,
            summary: draft.summary,
            body: draft.body,
            bodyFormat: draft.bodyFormat ?? fresh.bodyFormat,
            changeLog: draft.changeLog,
            isMajor: draft.isMajor,
            previousRevisionId: fresh.publishedRevisionId ?? null,
            contentHash,
            publishedById: draft.publishedById,
            publishTransactionId,
            status: 'published',
            authorId: fresh.authorId,
            reviewedById: fresh.reviewedById,
            approvedById: fresh.approvedById,
            approvedAt: fresh.approvedAt,
            publishedAt: now,
            effectiveAt: draft.effectiveAt ?? undefined,
            region: fresh.region,
            locale: fresh.locale,
            contactEmail: draft.contactEmail ?? fresh.contactEmail,
            companyName: draft.companyName ?? fresh.companyName,
            companyAddress: draft.companyAddress ?? fresh.companyAddress,
            dataProtectionOfficer: fresh.dataProtectionOfficer,
            grievanceOfficer: fresh.grievanceOfficer,
          },
        ],
        { session }
      );

      return { ok: true as const, revisionId, publishTransactionId, version: newVersion };
    });

    if (!publishOutcome) {
      return {
        ok: false,
        code: 'CAS_CONFLICT',
        message: 'Published revision changed; refresh and retry.',
      };
    }
    legalJobQueue.push({
      type: 'LEGAL_POLICY_PUBLISHED',
      revisionId: publishOutcome.revisionId,
      kind: policy.kind,
    });
    if (draft.isMajor) {
      legalJobQueue.push({
        type: 'LEGAL_RECONSENT_FANOUT',
        kind: policy.kind,
        version: publishOutcome.version,
      });
    }
    return publishOutcome;
  } finally {
    await session.endSession();
    await lock.release();
  }
}

export function assertSlugMatchesKind(kind: LegalKind, slug: string): void {
  if (slug !== slugForKind(kind)) {
    throw new Error('SLUG_KIND_MISMATCH');
  }
}
