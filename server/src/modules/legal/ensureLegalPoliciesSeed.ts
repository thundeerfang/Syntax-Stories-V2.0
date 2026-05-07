import crypto from 'node:crypto';
import { UserModel } from '../../models/User.js';
import { SYNTAX_ADMIN_EMAIL } from '../../bootstrap/ensureSyntaxAdminSeed.js';
import { LegalPolicyModel, LegalPolicyRevisionModel } from './models/legal.models.js';
import { computeLegalContentHash } from './legalContentHash.js';
import { slugForKind, type LegalKind } from './legalKinds.js';

const SEED_KINDS: LegalKind[] = ['terms', 'privacy', 'udd'];

const SEED_BODIES: Record<LegalKind, { title: string; summary: string; body: string }> = {
  terms: {
    title: 'Terms of Service',
    summary: 'Initial seeded Terms of Service.',
    body: '# Terms of Service\n\nThis is a placeholder. Replace via Admin Legal before production.',
  },
  privacy: {
    title: 'Privacy Policy',
    summary: 'Initial seeded Privacy Policy.',
    body: '# Privacy Policy\n\nThis is a placeholder. Replace via Admin Legal before production.',
  },
  udd: {
    title: 'User Data Deletion',
    summary: 'How to request deletion of your account data.',
    body: '# User Data Deletion\n\nSubmit a deletion request from account settings.',
  },
};

/**
 * Idempotent: creates published `legal_policies` + `legal_policy_revisions` for each kind when missing (global/en).
 */
export async function ensureLegalPoliciesSeed(): Promise<void> {
  const admin = await UserModel.findOne({ email: SYNTAX_ADMIN_EMAIL.toLowerCase() }).select('_id').lean();
  const authorId = admin?._id;
  if (!authorId) {
    console.warn('[seed] legal policies skipped — no CMS admin user yet');
    return;
  }

  for (const kind of SEED_KINDS) {
    const existing = await LegalPolicyModel.findOne({
      kind,
      region: 'global',
      locale: 'en',
      tenantId: null,
      productId: null,
      deletedAt: null,
    }).exec();
    if (existing) continue;

    const revisionId = crypto.randomUUID();
    const publishTransactionId = crypto.randomUUID();
    const b = SEED_BODIES[kind];
    const contentHash = computeLegalContentHash(b.title, b.summary, b.body);
    const slug = slugForKind(kind);

    const policy = await LegalPolicyModel.create({
      kind,
      slug,
      title: b.title,
      summary: b.summary,
      body: b.body,
      bodyFormat: 'markdown',
      status: 'published',
      version: 1,
      authorId: authorId,
      publishedRevisionId: revisionId,
      publishedAt: new Date(),
      region: 'global',
      locale: 'en',
      visibility: 'public',
    });

    await LegalPolicyRevisionModel.create({
      revisionId,
      policyId: policy._id,
      kind,
      version: 1,
      title: b.title,
      summary: b.summary,
      body: b.body,
      bodyFormat: 'markdown',
      changeLog: 'Bootstrap seed',
      isMajor: false,
      contentHash,
      publishTransactionId,
      status: 'published',
      authorId: authorId,
      publishedAt: new Date(),
      region: 'global',
      locale: 'en',
    });

    console.log(`[seed] legal policy created: ${kind} (${slug})`);
  }
}

export async function assertLegalBootstrapHealth(): Promise<{ ok: boolean; missing: string[] }> {
  const missing: string[] = [];
  for (const kind of ['terms', 'privacy'] as const) {
    const p = await LegalPolicyModel.findOne({
      kind,
      region: 'global',
      locale: 'en',
      tenantId: null,
      productId: null,
      deletedAt: null,
      status: 'published',
    }).exec();
    if (!p?.publishedRevisionId) missing.push(kind);
  }
  return { ok: missing.length === 0, missing };
}
