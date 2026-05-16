import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { UserModel } from '../../models/User.js';
import { SYNTAX_ADMIN_EMAIL } from '../../bootstrap/ensureSyntaxAdminSeed.js';
import { LegalPolicyModel, LegalPolicyRevisionModel } from './models/legal.models.js';
import { computeLegalContentHash } from './legalContentHash.js';
import { slugForKind, type LegalKind } from './legalKinds.js';
import { recordBootstrapLegalAcceptances } from './recordLegalAcceptances.js';

const SEED_KINDS: LegalKind[] = ['terms', 'privacy', 'udd'];

const SEED_BODIES: Record<LegalKind, { title: string; summary: string; body: string }> = {
  terms: {
    title: 'Terms of Service',
    summary: 'Rules for using Syntax Stories after you create an account.',
    body: `# Terms of Service

These Terms govern your use of Syntax Stories. Administrators may publish updated versions; continued use after updates may require a new acceptance where the product asks for it.

## 1. Agreement
By creating an account or using Syntax Stories, you agree to these Terms and our Privacy Policy.

## 2. Accounts
You are responsible for activity under your account. Keep your login secure.

## 3. Content
You retain rights to content you post. You grant us a licence to host, display, and distribute your content to operate the service.

## 4. Acceptable use
No unlawful, harmful, or abusive behaviour. We may suspend or terminate accounts that violate these rules.

## 5. Changes
We may update these Terms. We will publish new versions and may require you to accept them before certain actions.

## 6. Contact
Questions: use the contact options shown in the product or your region’s policy addendum.`,
  },
  privacy: {
    title: 'Privacy Policy',
    summary: 'What we collect, why we use it, and your choices.',
    body: `# Privacy Policy

This policy describes how Syntax Stories handles personal data when you use the service. It is provided as a starting point for development; tailor it for your entity and jurisdiction before production.

## 1. Who we are
Syntax Stories provides reading and writing features for technical stories and blogs.

## 2. Data we collect
- **Account:** email, name, username, profile details you provide.
- **Usage:** interactions with posts and the app to improve reliability and safety.
- **Technical:** device, logs, and similar data needed to run the service.

## 3. Why we use data
To provide accounts, publish content, secure the platform, and comply with law.

## 4. Sharing
We do not sell your personal data. We may use processors (e.g. hosting, email) under contracts.

## 5. Retention
We keep data as long as needed for the purposes above or as required by law.

## 6. Your rights
Depending on your region you may have rights to access, correct, delete, or object. Use in-app tools or contact us.

## 7. Children
The service is not directed at children under the age required in your jurisdiction.`,
  },
  udd: {
    title: 'User Data Deletion',
    summary: 'How to request deletion of your account data.',
    body: `# User Data Deletion

## Request deletion
You can request deletion of your personal data from **account settings** or the **data deletion** flow linked from Privacy.

## What happens
We verify your request, remove or anonymise data where permitted, and retain only what we must keep for legal or security reasons.

## Timing
We aim to complete requests within the timeframe required in your region.`,
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

/** After published policies exist: bind bootstrap admin to current Terms + Privacy so API writes work. */
export async function ensureSeedAdminLegalAcceptance(): Promise<void> {
  const health = await assertLegalBootstrapHealth();
  if (!health.ok) return;
  const admin = await UserModel.findOne({ email: SYNTAX_ADMIN_EMAIL.toLowerCase() }).select('_id').lean();
  if (!admin?._id) return;
  await recordBootstrapLegalAcceptances(new mongoose.Types.ObjectId(String(admin._id)));
}
