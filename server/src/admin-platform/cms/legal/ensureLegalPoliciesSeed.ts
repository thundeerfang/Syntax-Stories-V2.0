import mongoose from "mongoose";
import { UserModel } from "../../../models/User.js";
import { SYNTAX_ADMIN_EMAIL } from "../../seeds/bootstrap.constants.js";
import {
  LegalPolicyModel,
  LegalPolicyRevisionModel,
} from "./models/legal.models.js";
import { slugForKind, type LegalKind } from "./legalKinds.js";
import { recordBootstrapLegalAcceptances } from "./recordLegalAcceptances.js";
import { computeLegalContentHash } from "./legalContentHash.js";
import { publishPolicyRevision } from "./legalPublish.service.js";
import {
  ACCEPT_POLICY_KINDS,
  LEGAL_POLICY_KINDS,
} from "../../../variable/constants.js";
const SEED_KINDS: LegalKind[] = [...LEGAL_POLICY_KINDS];
const SEED_BODIES: Record<
  LegalKind,
  {
    title: string;
    summary: string;
    body: string;
    changeLog: string;
  }
> = {
  terms: {
    title: "Terms of Service",
    summary:
      "The rules for using Syntax Stories, creating content, and keeping the community safe.",
    body: `# Terms of Service

Welcome to Syntax Stories. These Terms explain the rules for using our website, mobile apps, APIs, and related services.

## 1. Your Account

You are responsible for the activity on your account and for keeping your login credentials secure. Use accurate information when creating an account and do not impersonate another person or organization.

## 2. Community Conduct

Use Syntax Stories respectfully. Do not post illegal, abusive, hateful, harassing, deceptive, spammy, or malicious content. Do not attempt to disrupt the platform, bypass security checks, scrape at abusive scale, or access accounts or systems without permission.

## 3. Your Content

You keep ownership of the stories, comments, profile details, and other content you submit. By posting content, you give Syntax Stories a worldwide, non-exclusive license to host, display, process, moderate, and distribute that content so the service can operate.

You must have the rights needed to publish anything you upload. We may remove content that violates these Terms, applicable law, or community safety expectations.

## 4. Platform Content

The Syntax Stories name, interface, branding, features, and platform materials are owned by Syntax Stories or its licensors. Do not copy, reverse engineer, or reuse protected platform materials except as allowed by law or written permission.

## 5. Paid Features

If paid plans or billing features are enabled, charges, renewals, cancellations, and refunds are handled according to the billing flow shown at purchase time and any applicable payment provider terms.

## 6. Service Changes

We may change, suspend, or discontinue features to improve the platform, maintain security, comply with law, or operate the service. We may also suspend or terminate accounts that violate these Terms.

## 7. Disclaimers

Syntax Stories is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted availability, error-free operation, or that user-generated content is accurate.

## 8. Limitation of Liability

To the maximum extent allowed by law, Syntax Stories is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.

## 9. Contact

For questions about these Terms, contact the Syntax Stories support or admin team through the channels provided in the app.`,
    changeLog: "Seeded published Terms of Service",
  },
  privacy: {
    title: "Privacy Policy",
    summary:
      "How Syntax Stories collects, uses, stores, and protects personal information.",
    body: `# Privacy Policy

This Privacy Policy explains how Syntax Stories handles personal information when you use our website, mobile apps, APIs, and related services.

## 1. Information We Collect

We may collect account information such as your name, username, email address, authentication details, profile details, uploaded media, posts, comments, settings, and support messages.

We may also collect technical information such as device details, IP address, browser or app version, approximate location derived from network data, log events, cookies, session data, and security signals.

## 2. How We Use Information

We use information to provide accounts, publish content, personalize feeds, secure the platform, send authentication and service messages, process billing where applicable, moderate content, prevent abuse, improve reliability, and comply with legal obligations.

## 3. Authentication and Emails

We use your email address to send transactional messages such as verification codes, security alerts, account notices, admin invitations, and billing-related service notices. These are not marketing campaigns.

## 4. Sharing

We do not sell your personal information. We may share information with service providers that help us run hosting, analytics, email delivery, billing, storage, security, and support workflows. We may also share information if required by law, to protect rights and safety, or during a business transfer.

## 5. Cookies and Local Storage

We may use cookies, local storage, and similar technologies for authentication, security, preferences, and product functionality.

## 6. Data Retention

We keep information for as long as needed to provide the service, maintain security, resolve disputes, enforce policies, comply with law, and preserve audit records. Some deleted content or account data may remain in backups or logs for a limited period.

## 7. Your Choices

You can update account details in settings where available. You may request account or data deletion through the User Data Deletion process. Some records may be retained when required for security, legal, billing, audit, or fraud-prevention reasons.

## 8. Security

We use reasonable technical and organizational safeguards to protect information. No internet service can guarantee absolute security.

## 9. Children's Privacy

Syntax Stories is not intended for children under the age required by applicable law. If you believe a child provided personal information, contact us so we can review the account.

## 10. Contact

For privacy questions or requests, contact the Syntax Stories support or admin team through the channels provided in the app.`,
    changeLog: "Seeded published Privacy Policy",
  },
  udd: {
    title: "User Data Deletion",
    summary:
      "How users can request deletion of their Syntax Stories account and personal data.",
    body: `# User Data Deletion

This page explains how to request deletion of your Syntax Stories account and personal data.

## 1. How To Request Deletion

You can submit a data deletion request from the account or settings area when signed in. If you cannot access your account, contact the Syntax Stories support or admin team from the email address linked to your account.

## 2. 30-Day Grace Period

After you submit a deletion request, Syntax Stories keeps the request in a 30-day grace period. During this period, deletion is pending and your account data is not permanently removed from active systems. If cancellation is supported in the app or by support, you may request cancellation during this period.

## 3. What We Delete

After the 30-day grace period ends, we permanently delete or anonymize account profile data, authentication records, user preferences, notifications, device tokens, engagement records, and user-generated content where deletion is supported.

## 4. What May Be Retained

Some information may be retained where required for legal compliance, security, fraud prevention, billing, dispute resolution, audit logs, backup integrity, or enforcement of platform rules. Retained records are limited to what is necessary for those purposes.

## 5. Processing Time

Deletion requests are normally completed after the 30-day grace period. Complex requests, active disputes, security reviews, legal holds, or required retained records may take longer or may be excluded from deletion where permitted by law.

## 6. Before You Request Deletion

Deletion after the grace period is permanent. You may lose access to your account, posts, comments, saved data, subscription benefits, and other Syntax Stories features.

## 7. Status Updates

Where supported, you can view deletion request status in the app. We may contact you if more information is needed to verify or complete your request.

## 8. Contact

For questions about user data deletion, contact the Syntax Stories support or admin team through the channels provided in the app.`,
    changeLog: "Seeded User Data Deletion policy with 30-day grace period",
  },
};
async function currentPublishedHash(policy: {
  publishedRevisionId?: string | null;
}): Promise<string | null> {
  if (!policy.publishedRevisionId) return null;
  const revision = await LegalPolicyRevisionModel.findOne({
    revisionId: policy.publishedRevisionId,
  })
    .select("contentHash")
    .lean();
  return revision?.contentHash ?? null;
}
async function createPolicyShell(
  kind: LegalKind,
  authorId: mongoose.Types.ObjectId,
) {
  const b = SEED_BODIES[kind];
  const slug = slugForKind(kind);
  const policy = await LegalPolicyModel.create({
    kind,
    slug,
    title: b.title,
    summary: b.summary,
    body: b.body,
    bodyFormat: "markdown",
    status: "draft",
    version: 0,
    authorId,
    region: "global",
    locale: "en",
    visibility: "public",
    changeLog: b.changeLog,
    isMajor: false,
    acknowledgementTypeDefault:
      kind === "udd" ? "implicit" : "checkbox",
  });
  console.log(`[seed] legal policy shell created: ${kind} (${slug})`);
  return policy;
}
async function ensurePublishedPolicy(
  kind: LegalKind,
  authorId: mongoose.Types.ObjectId,
): Promise<void> {
  const b = SEED_BODIES[kind];
  const slug = slugForKind(kind);
  let policy = await LegalPolicyModel.findOne({
    kind,
    region: "global",
    locale: "en",
    tenantId: null,
    productId: null,
    deletedAt: null,
  }).exec();
  if (!policy) {
    policy = await createPolicyShell(kind, authorId);
  }
  const workingPolicy = policy;
  if (workingPolicy.slug !== slug) {
    workingPolicy.slug = slug;
  }
  workingPolicy.title = b.title;
  workingPolicy.summary = b.summary;
  workingPolicy.body = b.body;
  workingPolicy.bodyFormat = "markdown";
  workingPolicy.visibility = "public";
  workingPolicy.changeLog = b.changeLog;
  workingPolicy.isMajor = false;
  workingPolicy.authorId = workingPolicy.authorId ?? authorId;
  workingPolicy.acknowledgementTypeDefault =
    kind === "udd" ? "implicit" : "checkbox";
  await workingPolicy.save();
  const nextHash = computeLegalContentHash(b.title, b.summary, b.body);
  const liveHash = await currentPublishedHash(workingPolicy);
  if (workingPolicy.status === "published" && liveHash === nextHash) {
    console.log(`[seed] legal policy already published: ${kind} (${slug})`);
    return;
  }
  const published = await publishPolicyRevision({
    policy: workingPolicy,
    draft: {
      title: b.title,
      summary: b.summary,
      body: b.body,
      bodyFormat: "markdown",
      changeLog: b.changeLog,
      isMajor: false,
      publishedById: authorId,
      expectedPublishedRevisionId: workingPolicy.publishedRevisionId ?? null,
    },
  });
  if (!published.ok) {
    throw new Error(
      `Failed to publish seeded legal policy ${kind}: ${published.message}`,
    );
  }
  console.log(
    `[seed] legal policy published: ${kind} (${slug}) v${published.version}`,
  );
}
export async function ensureLegalPoliciesSeed(): Promise<void> {
  const admin = await UserModel.findOne({
    email: SYNTAX_ADMIN_EMAIL.toLowerCase(),
  })
    .select("_id")
    .lean();
  const authorId = admin?._id;
  if (!authorId) {
    console.warn("[seed] legal policies skipped — no CMS admin user yet");
    return;
  }
  for (const kind of SEED_KINDS) {
    await ensurePublishedPolicy(
      kind,
      authorId as mongoose.Types.ObjectId,
    );
  }
}
export async function assertLegalBootstrapHealth(): Promise<{
  ok: boolean;
  missing: string[];
}> {
  const missing: string[] = [];
  for (const kind of ACCEPT_POLICY_KINDS) {
    const p = await LegalPolicyModel.findOne({
      kind,
      region: "global",
      locale: "en",
      tenantId: null,
      productId: null,
      deletedAt: null,
      status: "published",
    }).exec();
    if (!p?.publishedRevisionId) missing.push(kind);
  }
  return { ok: missing.length === 0, missing };
}
export async function ensureSeedAdminLegalAcceptance(): Promise<void> {
  const health = await assertLegalBootstrapHealth();
  if (!health.ok) return;
  const admin = await UserModel.findOne({
    email: SYNTAX_ADMIN_EMAIL.toLowerCase(),
  })
    .select("_id")
    .lean();
  if (!admin?._id) return;
  await recordBootstrapLegalAcceptances(
    new mongoose.Types.ObjectId(String(admin._id)),
  );
}
