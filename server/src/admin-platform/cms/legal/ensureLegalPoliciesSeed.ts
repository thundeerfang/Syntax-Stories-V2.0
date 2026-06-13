import mongoose from 'mongoose';
import { UserModel } from '../../../models/User.js';
import { SYNTAX_ADMIN_EMAIL } from '../../seeds/bootstrap.constants.js';
import { LegalPolicyModel } from './models/legal.models.js';
import { slugForKind, type LegalKind } from './legalKinds.js';
import { recordBootstrapLegalAcceptances } from './recordLegalAcceptances.js';

const SEED_KINDS: LegalKind[] = ['terms', 'privacy', 'udd'];

const SEED_BODIES: Record<LegalKind, { title: string; summary: string; body: string }> = {
  terms: {
    title: 'Terms of Service',
    summary: '',
    body: '',
  },
  privacy: {
    title: 'Privacy Policy',
    summary: '',
    body: '',
  },
  udd: {
    title: 'User Data Deletion',
    summary: '',
    body: '',
  },
};

/**
 * Idempotent: creates published `legal_policies` + `legal_policy_revisions` for each kind when missing (global/en).
 */
export async function ensureLegalPoliciesSeed(): Promise<void> {
  const admin = await UserModel.findOne({ email: SYNTAX_ADMIN_EMAIL.toLowerCase() })
    .select('_id')
    .lean();
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

    const b = SEED_BODIES[kind];
    const slug = slugForKind(kind);

    await LegalPolicyModel.create({
      kind,
      slug,
      title: b.title,
      summary: b.summary,
      body: b.body,
      bodyFormat: 'markdown',
      status: 'draft',
      version: 0,
      authorId: authorId,
      region: 'global',
      locale: 'en',
      visibility: 'public',
      changeLog: 'Initial draft — edit in admin Legal before publishing',
    });

    console.log(`[seed] legal policy draft shell created: ${kind} (${slug})`);
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

/** After published policies exist: bind bootstrap admin to current Terms + Privacy so API writes work. */
export async function ensureSeedAdminLegalAcceptance(): Promise<void> {
  const health = await assertLegalBootstrapHealth();
  if (!health.ok) return;
  const admin = await UserModel.findOne({ email: SYNTAX_ADMIN_EMAIL.toLowerCase() })
    .select('_id')
    .lean();
  if (!admin?._id) return;
  await recordBootstrapLegalAcceptances(new mongoose.Types.ObjectId(String(admin._id)));
}
