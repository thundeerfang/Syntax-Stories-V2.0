# Legal policies, consent & UDD — enterprise specification

This document is the **source of truth** for Terms of Service, Privacy Policy, User Data Deletion (UDD), **user consent tracking**, **operational workflows**, **MongoDB schemas**, and **REST API contracts**. It extends the original CMS-first design with **audit-ready, app-store, and scale** requirements.

**Related:** public routes `/terms`, `/privacy`, `/user-data-deletion`; footer labels `Terms.txt`, `Privacy.txt`, `UDD.txt`; primary nav excludes API.

---

## Table of contents

1. [Goals](#1-goals)
2. [Public webapp — routes & UX](#2-public-webapp--routes--ux)
3. [Strategic model: Help CMS vs dedicated collections](#3-strategic-model-help-cms-vs-dedicated-collections)
4. [User legal acceptance (consent)](#4-user-legal-acceptance-consent)
5. [Versioning, revisions & immutability](#5-versioning-revisions--immutability)
6. [Workflow: draft → review → approved → published](#6-workflow-draft--review--approved--published)
7. [Policy diff & rollback](#7-policy-diff--rollback)
8. [Jurisdiction, locale & compliance metadata](#8-jurisdiction-locale--compliance-metadata)
9. [Data deletion requests (backend)](#9-data-deletion-requests-backend)
10. [Rate limiting & abuse protection](#10-rate-limiting--abuse-protection)
11. [SEO & structured data](#11-seo--structured-data)
12. [Emergency fallback & cache invalidation](#12-emergency-fallback--cache-invalidation)
13. [Audit logging (detailed)](#13-audit-logging-detailed)
14. [Secure preview tokens](#14-secure-preview-tokens)
15. [Hard slug / kind constraints](#15-hard-slug--kind-constraints)
16. [MongoDB schemas](#16-mongodb-schemas)
17. [REST API contracts](#17-rest-api-contracts)
18. [Webapp implementation checklist](#18-webapp-implementation-checklist)
19. [Open decisions](#19-open-decisions)
20. [Summary verdict](#20-summary-verdict)
21. [Consent enforcement layer](#21-consent-enforcement-layer)
22. [Content hash & snapshot integrity](#22-content-hash--snapshot-integrity)
23. [Legal hold & retention overrides (UDD)](#23-legal-hold--retention-overrides-udd)
24. [Background jobs & async processing](#24-background-jobs--async-processing)
25. [Re-consent campaign execution](#25-re-consent-campaign-execution)
26. [Multi-tenancy & product context](#26-multi-tenancy--product-context)
27. [Legal analytics & visibility](#27-legal-analytics--visibility)
28. [Deleted users & account lifecycle](#28-deleted-users--account-lifecycle)
29. [Policy dependencies](#29-policy-dependencies)
30. [Testing strategy](#30-testing-strategy)
31. [Additional schema & metadata fields](#31-additional-schema--metadata-fields)
32. [Architectural framing & maturity scorecard](#32-architectural-framing--maturity-scorecard)
33. [Strong consistency & legal correctness](#33-strong-consistency--legal-correctness)
34. [Idempotency for critical APIs](#34-idempotency-for-critical-apis)
35. [Distributed locking & publish guards](#35-distributed-locking--publish-guards)
36. [Disaster recovery & restore](#36-disaster-recovery--restore)
37. [Tamper detection & periodic integrity audit](#37-tamper-detection--periodic-integrity-audit)
38. [Time-based policy activation (`effectiveAt`)](#38-time-based-policy-activation-effectiveat)
39. [Grace period before strict enforcement](#39-grace-period-before-strict-enforcement)
40. [Audit immutability](#40-audit-immutability)
41. [Cross-service enforcement](#41-cross-service-enforcement)
42. [Client / API version negotiation](#42-client--api-version-negotiation)
43. [Event sourcing option](#43-event-sourcing-option)
44. [Deletion SLA tracking](#44-deletion-sla-tracking)
45. [Re-consent notification & delivery tracking](#45-re-consent-notification--delivery-tracking)
46. [Optional policy A/B rollout](#46-optional-policy-ab-rollout)
47. [Clock consistency & authoritative time](#47-clock-consistency--authoritative-time)
48. [Replay protection for accept API](#48-replay-protection-for-accept-api)
49. [Job sagas: partial failure & execution steps](#49-job-sagas-partial-failure--execution-steps)
50. [Compensation & permanent job failure](#50-compensation--permanent-job-failure)
51. [Schema migration & backward compatibility](#51-schema-migration--backward-compatibility)
52. [PII minimization for acceptance & telemetry](#52-pii-minimization-for-acceptance--telemetry)
53. [Field-level permissions (legal metadata)](#53-field-level-permissions-legal-metadata)
54. [Observability & monitoring](#54-observability--monitoring)
55. [Backpressure & load shedding](#55-backpressure--load-shedding)
56. [Cold start & bootstrap](#56-cold-start--bootstrap)
57. [Ultra-advanced options](#57-ultra-advanced-options)
58. [Production maturity scorecard (final)](#58-production-maturity-scorecard-final)
59. [Final production risks checklist & design freeze](#59-final-production-risks-checklist--design-freeze)

---

## 1. Goals

| Goal | Detail |
|------|--------|
| **Single source of truth** | Legal text authored in admin; not hardcoded in webapp (except controlled fallbacks). |
| **Stable public URLs** | Store listings and SEO use fixed paths. |
| **Consent tracking** | Record **which version** of Terms/Privacy each user accepted, when, and context (IP/UA where lawful). |
| **Version discipline** | Monotonic `version`, immutable **revision** snapshots, `isMajor` to drive **re-acceptance**. |
| **Operational maturity** | Draft → **in_review** → **approved** → published; soft locks; no accidental publish. |
| **UDD as product** | Public UDD page **plus** backend **deletion request** lifecycle, not docs alone. |
| **Audit & preview** | Structured audit events; time-limited **preview** links for external counsel. |

---

## 2. Public webapp — routes & UX

| Footer label | Path | Purpose |
|--------------|------|---------|
| **Terms.txt** | `/terms` | Terms of Service (HTML page; `.txt` is branding). |
| **Privacy.txt** | `/privacy` | Privacy Policy. |
| **UDD.txt** | `/user-data-deletion` | Instructions + link to **request deletion** (authenticated flow). |

- Optional **301 aliases:** `/terms.txt` → `/terms`, `/privacy.txt` → `/privacy`, `/udd` → `/user-data-deletion`.
- If API returns no published policy: show **“Policy being updated”** + `/contact` (no empty 200).
- **Consent UI:** on signup / login after `isMajor` publish: modal or interstitial requiring accept to continue (product decision); API must expose **required version** vs **user’s last acceptance**.

---

## 3. Strategic model: Help CMS vs dedicated collections

### 3.1 Phase 1 — Reuse `HelpArticle` (fast path)

- Category `legal`, fixed slugs `terms-of-service`, `privacy-policy`, `user-data-deletion`.
- **Gap:** Help model lacks `reviewedBy`, `isMajor`, `revisionId`, consent coupling, deletion requests.

### 3.2 Phase 2 — **Recommended for enterprise** (this spec’s full schema)

Introduce dedicated collections (**§16**) that **reference** or **mirror** published content:

- **`legal_policies`** — current working row per `kind` (or per `kind+region+locale`) + workflow + metadata.
- **`legal_policy_revisions`** — **immutable** published (and optionally approved) snapshots for diff/rollback.
- **`user_legal_acceptances`** — consent log.
- **`data_deletion_requests`** — UDD operational queue.
- **`legal_preview_tokens`** — short-lived preview (optional separate collection for TTL indexes).

Help CMS can remain the **editor** surface that writes into `legal_policies` / creates revisions, or legal moves entirely to admin-only legal screens.

**Verdict:** Implement **§16–§17** on the dedicated-collection path for audit clarity; keep Help only as optional legacy bridge during migration.

---

## 4. User legal acceptance (consent)

### 4.1 Why

- GDPR / DPDP / dispute evidence: prove **which text** the user agreed to.
- **Major** policy updates: force re-accept before continued use (configurable).

### 4.2 Rules

- Store **policy kind** + **published `version`** (and optionally `revisionId`) at acceptance time.
- Capture **`ipAddress`** / **`userAgent`** only where **lawful** and disclosed in Privacy (e.g. fraud, audit).
- Unique compound index suggestion: `(userId, policyKind, version)` allows history; latest row queryable by sort `acceptedAt`.

---

## 5. Versioning, revisions & immutability

| Field | Purpose |
|-------|---------|
| `version` | Monotonic integer per `kind` (public “v3”). |
| `revisionId` | UUID for this immutable snapshot. |
| `previousRevisionId` | Linked list for ancestry. |
| `changeLog` | Human summary: “Updated retention §4”. |
| `isMajor` | If true → triggers **re-consent** campaign / gate. |

**Published snapshot:** once `status === published`, revision document is **append-only** (no in-place body edits; fix = new revision).

---

## 6. Workflow: draft → review → approved → published

```
draft → in_review → approved → published → archived
```

| Field | Purpose |
|-------|---------|
| `reviewedBy` | Staff id + timestamp. |
| `approvedBy` | Separate from author; **publish** only if `approvedBy` set (configurable strict mode). |
| `approvedAt` | Audit. |
| **Soft lock** | `lockedBy` + `lockedAt` (reuse help pattern) during edit. |

RBAC examples: `legal:draft`, `legal:review`, `legal:approve`, `legal:publish`, `legal:archive`.

---

## 7. Policy diff & rollback

- **Admin UI:** side-by-side or unified diff between `revisionId` A and B (text diff on `body`).
- **Rollback (product):** set **current published pointer** to a **previous revision** (new publish event that re-promotes old snapshot — still a new audit row; optionally `version` bump with `changeLog: "Rollback to revision …"`).

---

## 8. Jurisdiction, locale & compliance metadata

Embed on **policy** (and optionally on **revision** for frozen copy):

```text
region: 'global' | 'EU' | 'IN' | 'US' | ...
locale: 'en' | 'hi' | ...
countryOverrides: string[]   // ISO codes; future selective overrides
contactEmail
companyName
companyAddress
dataProtectionOfficer        // optional structured { name, email }
grievanceOfficer             // India / similar jurisdictions
```

Public API may filter `region` + `locale` via `Accept-Language` + geo headers (careful: prefer **explicit user region** in profile later).

---

## 9. Data deletion requests (backend)

UDD is **not** only static text.

| Status | Meaning |
|--------|---------|
| `requested` | User opened request. |
| `processing` | Staff/system working. |
| `completed` | Done; retention rules applied. |
| `rejected` | With auditable reason (not arbitrary). |

Fields: `userId`, `status`, `requestedAt`, `completedAt`, `notes` (staff), `reason` (user-visible if rejected), link to **ticket id** optional.

---

## 10. Rate limiting & abuse protection

- **Deletion requests:** max **1 open request** per user; cooldown **24h** between new requests after close (tunable).
- **Auth:** authenticated users only for POST request (or email-verified flow for deleted accounts edge case — separate flow).
- **ALTCHA / captcha** on anonymous endpoints if any public form exists.
- Apply existing **per-IP** rate limits on `POST /api/v1/legal/data-deletion-requests`.

---

## 11. SEO & structured data

- **`generateMetadata`:** title, description, **canonical** URL per route.
- **OpenGraph:** `og:title`, `og:description`, `og:url`.
- **JSON-LD:** e.g. `WebPage` + publisher; where applicable `schema.org` fragments for organization contact (align with Google rich result guidelines; not a substitute for real legal review).

---

## 12. Emergency fallback & cache invalidation

### 12.1 Fallback

- **Server:** If public API fails, serve **last embedded snapshot** from build (`/legal-fallback/terms.v3.json`) updated at release **or** Redis cache.
- **Client:** Never block blank; show cached markdown from SWR/React Query stale data if configured.

### 12.2 Invalidation

- On **publish:** bump `version` → URL query `?v=` or path includes version in **API only**; webapp uses **SWR key** with version from response.
- **CDN:** purge `/api/v1/legal/*` and static HTML routes for legal pages (or rely on short `max-age` + `stale-while-revalidate`).

**Invariant (§33):** Legal **correctness** for accept / publish decisions must **never** depend on CDN or browser cache — only on **authoritative DB reads** (and optional linearizable read concern for publish path).

---

## 13. Audit logging (detailed)

Extend existing `AuditLog` pattern (`action`, `actorId`, `targetType`, `targetId`, `metadata`, `ip`, `userAgent`, `timestamp`).

**New action strings (examples):**

- `legal.policy.draft_saved`
- `legal.policy.submitted_review`
- `legal.policy.approved`
- `legal.policy.published`
- `legal.policy.archived`
- `legal.policy.preview_created`
- `legal.user.accepted_terms`
- `legal.user.accepted_privacy`
- `legal.deletion.requested`
- `legal.deletion.status_changed`

**`metadata` payload examples:**

```json
{
  "kind": "terms",
  "version": 4,
  "revisionId": "uuid",
  "slug": "terms-of-service",
  "isMajor": true
}
```

**Immutability:** Legal audit rows must be **append-only**; optional hash-chain / WORM — see **§40**.

---

## 14. Secure preview tokens

| Field | Purpose |
|-------|---------|
| `token` | High-entropy random, hashed at rest optional. |
| `revisionId` | Which draft or approved revision. |
| `expiresAt` | TTL index in Mongo. |
| `createdBy` | Staff id. |

**GET** `/api/v1/legal/preview?token=…` returns **same shape as public** but for **non-published** revision; no cache; `noindex` header.

---

## 15. Hard slug / kind constraints

**Invariant table (enforce in Zod + DB validation):**

| `kind` | Allowed `slug` |
|--------|----------------|
| `terms` | `terms-of-service` |
| `privacy` | `privacy-policy` |
| `udd` | `user-data-deletion` |

Reject any create/patch that breaks mapping. Public routes map `kind` ↔ slug centrally.

---

## 16. MongoDB schemas

Naming: snake_case collection names illustrative; implement as `legalPolicies` etc. in Mongoose.

### 16.1 `legal_policies` (working document, one row per `kind` + `region` + `locale` or v1 global only)

```ts
// TypeScript shape — implement with Mongoose Schema
interface LegalPolicy {
  _id: ObjectId;
  kind: 'terms' | 'privacy' | 'udd';
  slug: string; // MUST match §15

  title: string;
  summary: string;
  body: string;
  bodyFormat: 'markdown' | 'mdx' | 'richtext';

  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';

  version: number;              // next publish version
  draftRevisionId?: string;     // UUID pointer to working draft revision row optional

  changeLog?: string;           // pending publish message
  isMajor?: boolean;            // pending; copied to revision on publish

  authorId: ObjectId;
  reviewedById?: ObjectId;
  reviewedAt?: Date;
  approvedById?: ObjectId;
  approvedAt?: Date;

  publishedRevisionId?: string; // current public revision UUID
  publishedAt?: Date;
  effectiveAt?: Date;

  region: 'global' | 'EU' | 'IN' | 'US';
  locale: string;
  countryOverrides?: string[];

  contactEmail?: string;
  companyName?: string;
  companyAddress?: string;
  dataProtectionOfficer?: { name?: string; email?: string };
  grievanceOfficer?: { name?: string; email?: string };

  /** Optional SaaS / multi-app (§26). */
  tenantId?: ObjectId | null;
  productId?: string | null;

  /** Default UX for accept flows (§31). */
  acknowledgementTypeDefault?: 'checkbox' | 'implicit' | 'scroll_required';

  visibility?: 'public' | 'internal';
  /** Denormalized plain text for admin search (§31). */
  searchIndex?: string;
  readTimeMinutes?: number;

  /** Days after major publish before **§21** strict enforcement applies — §39. */
  gracePeriodDays?: number;

  lockedById?: ObjectId | null;
  lockedAt?: Date | null;

  deletedAt?: Date | null;

  /** Monotonic document shape version for **§51** migrations. */
  schemaVersion?: number;

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ kind: 1, region: 1, locale: 1 }` unique (if one row per triple); `{ slug: 1 }` unique; `{ status: 1 }`; optional `{ tenantId: 1, productId: 1, kind: 1 }` unique when multi-tenant.

---

### 16.2 `legal_policy_revisions` (immutable snapshots)

```ts
interface LegalPolicyRevision {
  _id: ObjectId;
  revisionId: string;          // UUID, unique
  policyId: ObjectId;          // ref legal_policies
  kind: 'terms' | 'privacy' | 'udd';
  version: number;

  title: string;
  summary: string;
  body: string;
  bodyFormat: 'markdown' | 'mdx' | 'richtext';

  changeLog: string;
  isMajor: boolean;
  previousRevisionId?: string | null;

  /** SHA-256 of canonical body (and optionally title+summary) at freeze time — §22. */
  contentHash: string;

  /** Who clicked publish / system job id ref (§31). */
  publishedById?: ObjectId | null;

  /** Correlates publish + jobs + accept race debugging — §33. */
  publishTransactionId?: string;

  /** e.g. Privacy v5 requires Terms ≥ v4 (§29). */
  requiresPolicyVersions?: { terms?: number; privacy?: number; udd?: number };

  status: 'approved' | 'published' | 'superseded'; // published = was ever live; superseded = replaced

  authorId: ObjectId;
  reviewedById?: ObjectId;
  approvedById?: ObjectId;
  approvedAt?: Date;
  publishedAt?: Date;
  effectiveAt?: Date;

  region: string;
  locale: string;
  contactEmail?: string;
  companyName?: string;
  companyAddress?: string;
  dataProtectionOfficer?: { name?: string; email?: string };
  grievanceOfficer?: { name?: string; email?: string };

  createdAt: Date;
}
```

**Indexes:** `{ revisionId: 1 }` unique; `{ policyId: 1, version: -1 }`; `{ kind: 1, region: 1, locale: 1, version: -1 }`.

---

### 16.3 `user_legal_acceptances`

```ts
interface UserLegalAcceptance {
  _id: ObjectId;
  userId: ObjectId;
  policyKind: 'terms' | 'privacy';
  version: number;
  revisionId: string;
  /** Copy of revision.contentHash at moment of accept — proves exact bytes user saw (§22). */
  contentHash: string;
  acknowledgementType?: 'checkbox' | 'implicit' | 'scroll_required';
  acceptedAt: Date;
  ipAddress?: string;          // if lawful + disclosed; prefer **§52** hash + TTL
  ipAddressHash?: string;
  userAgent?: string;
  source: 'signup' | 'settings' | 'forced_prompt' | 'api';
}
```

**Indexes:** `{ userId: 1, policyKind: 1, acceptedAt: -1 }`; `{ userId: 1, policyKind: 1, version: 1 }` for idempotency rules (define product-wise).

---

### 16.4 `data_deletion_requests`

```ts
interface DataDeletionRequest {
  _id: ObjectId;
  userId: ObjectId;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  notes?: string;              // staff internal
  reason?: string;             // user-visible if rejected
  lastStatusChangeById?: ObjectId;
  /** When true, deletion must not proceed until cleared (fraud / regulatory) — §23. */
  legalHold: boolean;
  legalHoldReason?: string;
  legalHoldSetById?: ObjectId;
  legalHoldSetAt?: Date;
  legalHoldClearedAt?: Date;

  /** Ops SLA — §44. */
  slaDeadline?: Date;
  slaBreached?: boolean;

  /** Saga progress for **§49** — e.g. profile, orders, search index. */
  executionSteps?: { step: string; status: 'pending' | 'done' | 'failed'; at?: Date; error?: string }[];
  /** When job cannot complete cleanly — **§50**. */
  compensationStatus?: 'none' | 'partially_completed' | 'manual_recovery_required';
}
```

**Indexes:** `{ userId: 1, status: 1 }`; `{ userId: 1, requestedAt: -1 }`; `{ slaDeadline: 1 }` for job queries; TTL optional **not** on whole doc (keep history).

---

### 16.5 `legal_preview_tokens` (optional)

```ts
interface LegalPreviewToken {
  _id: ObjectId;
  tokenHash: string;           // SHA-256 of raw token
  revisionId: string;
  createdById: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}
```

**Index:** TTL on `expiresAt`; unique `tokenHash`.

---

## 17. REST API contracts

Base path: `/api/v1/legal` (public + user); `/api/v1/admin/legal` (staff). All JSON; `Content-Type: application/json`.

### 17.1 Public — get published policy by kind

**GET** `/api/v1/legal/policies/:kind`  
`kind` ∈ `terms` | `privacy` | `udd`

**200**

```json
{
  "ok": true,
  "kind": "terms",
  "slug": "terms-of-service",
  "version": 4,
  "revisionId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Terms of Service",
  "summary": "…",
  "body": "# Markdown…",
  "bodyFormat": "markdown",
  "publishedAt": "2026-05-01T12:00:00.000Z",
  "effectiveAt": "2026-05-01T12:00:00.000Z",
  "region": "global",
  "locale": "en",
  "isMajor": false,
  "contactEmail": "legal@example.com",
  "companyName": "Syntax Stories Corp"
}
```

**404** `{ "ok": false, "code": "LEGAL_NOT_FOUND", "message": "No published policy" }`

**Headers:** `Cache-Control: public, max-age=60, stale-while-revalidate=300`

---

### 17.2 Public — preview (token)

**GET** `/api/v1/legal/preview?token=<raw>`

**200:** same envelope as §17.1 but may be `status: approved` revision; headers `X-Robots-Tag: noindex`, `Cache-Control: private, no-store`.

**401** invalid/expired token: `{ "ok": false, "code": "LEGAL_PREVIEW_INVALID" }`

---

### 17.3 Authenticated user — record acceptance

**POST** `/api/v1/legal/accept`  
Auth: Bearer session.

**Body**

```json
{
  "policyKind": "terms",
  "version": 4,
  "revisionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**200**

```json
{
  "ok": true,
  "accepted": true,
  "userId": "<id>",
  "policyKind": "terms",
  "version": 4,
  "revisionId": "550e8400-e29b-41d4-a716-446655440000",
  "acceptedAt": "2026-05-03T10:00:00.000Z"
}
```

**409** version mismatch: `{ "ok": false, "code": "LEGAL_VERSION_MISMATCH", "requiredVersion": 5 }`

**422** validation errors.

---

### 17.4 Authenticated user — consent status

**GET** `/api/v1/legal/me/status`

**200**

```json
{
  "ok": true,
  "terms": { "acceptedVersion": 3, "requiredVersion": 4, "mustReaccept": true },
  "privacy": { "acceptedVersion": 4, "requiredVersion": 4, "mustReaccept": false }
}
```

`requiredVersion` / `mustReaccept` derived from latest **published** `isMajor` bump or product rules.

---

### 17.5 Authenticated user — request data deletion

**POST** `/api/v1/legal/data-deletion-requests`

**Body:** `{}` or `{ "message": "optional user note" }`

**201**

```json
{
  "ok": true,
  "id": "<requestId>",
  "status": "requested",
  "requestedAt": "2026-05-03T10:00:00.000Z"
}
```

**429** cooldown: `{ "ok": false, "code": "LEGAL_DELETION_COOLDOWN", "retryAfterSec": 86400 }`

**409** open request exists: `{ "ok": false, "code": "LEGAL_DELETION_OPEN" }`

---

### 17.6 Authenticated user — list my deletion requests

**GET** `/api/v1/legal/data-deletion-requests?limit=20`

**200:** `{ "ok": true, "items": [ { "id", "status", "requestedAt", "completedAt" } ] }`

---

### 17.7 Admin — list policies (working)

**GET** `/api/v1/admin/legal/policies`  
Permissions: `legal:read`

**200:** `{ "ok": true, "items": [ { …LegalPolicy sans large body… } ] }`

---

### 17.8 Admin — get policy + revision history

**GET** `/api/v1/admin/legal/policies/:policyId`  
**GET** `/api/v1/admin/legal/policies/:policyId/revisions?limit=50`

---

### 17.9 Admin — save draft / submit review / approve

**PATCH** `/api/v1/admin/legal/policies/:policyId`

```json
{
  "action": "save_draft | submit_review | approve | publish | archive",
  "title": "…",
  "summary": "…",
  "body": "…",
  "changeLog": "Updated retention",
  "isMajor": true,
  "effectiveAt": "2026-06-01T00:00:00.000Z",
  "contactEmail": "…",
  "companyName": "…"
}
```

**200:** `{ "ok": true, "policy": { … } }`  
**403:** insufficient permission.  
**409:** invalid state transition or not locked properly.

**Publish** implementation: create `legal_policy_revisions` row → set `legal_policies.publishedRevisionId`, `publishedAt`, bump `version`, audit log, trigger cache purge job.

---

### 17.10 Admin — diff two revisions

**GET** `/api/v1/admin/legal/revisions/diff?from=<revisionId>&to=<revisionId>`  
Returns `{ "ok": true, "unifiedDiff": "…" }` or structured hunks (product choice).

---

### 17.11 Admin — deletion request queue

**GET** `/api/v1/admin/legal/data-deletion-requests?status=requested&limit=50`  
**PATCH** `/api/v1/admin/legal/data-deletion-requests/:id` `{ "status": "processing", "notes": "…" }`  
**PATCH** body may include `{ "legalHold": true, "legalHoldReason": "…" }` (staff) per **§23**.

---

### 17.12 Admin — legal analytics & re-consent funnel

**GET** `/api/v1/admin/legal/analytics?kind=terms&version=4`  
Permissions: `legal:read` or `legal:analytics`.

**200 (example)**

```json
{
  "ok": true,
  "kind": "terms",
  "version": 4,
  "revisionId": "uuid",
  "acceptedUsersCount": 12000,
  "pendingReconsentCount": 3000,
  "isMajor": true,
  "computedAt": "2026-05-03T12:00:00.000Z"
}
```

Counts derived from `user_legal_acceptances` vs current **published** `version` / `mustReaccept` rules (**§25**). Heavy queries should run off read replicas or pre-aggregated materialized stats updated by **§24** jobs.

---

## 18. Webapp implementation checklist

1. Legal pages fetch **§17.1**; fallback **§12.1**.
2. Signup/settings: call **§17.3** after user checks boxes; gate with **§17.4**.
3. **Server middleware / BFF:** enforce **§21** (`mustReaccept`) on mutating routes when `enforcementMode` is `strict`.
4. UDD page: static policy body + CTA → POST **§17.5** + status widget from **§17.6**; respect **§23** legal hold in admin UI.
5. Admin UI: workflow **§6**, diff **§7**, preview **§14**, audit **§13**, analytics **§17.12**, legal hold toggles **§23**.
6. Wire **§24** workers for publish, purge, deletion pipeline, re-consent fan-out.
7. Seed **§15** slugs + initial `legal_policies` rows.
8. Footer links already wired in webapp; implement **§30** test suite in CI.

---

## 19. Open decisions

1. Whether **IP/UA** on acceptance is stored (jurisdiction-dependent).
2. **`enforcementMode`:** `strict` (block non-exempt API) vs `soft` (warn + log only) — product + counsel (**§21**).
3. **Forced reaccept** UX: block all API vs block write actions only (maps to enforcement allowlists).
4. **Multi-region** v1: ship `global` + `en` only vs full matrix.
5. DPO / grievance officer required before first **IN** launch.
6. **Job stack:** BullMQ vs existing cron vs cloud queue — ops choice (**§24**).

---

## 20. Summary verdict

| Layer | Status |
|-------|--------|
| Public URLs + CMS | Spec’d |
| **Consent** | **§4, §16.3, §17.3–17.4** |
| **Consent enforcement** | **§21** — *critical path; without it consent is logging-only* |
| **Content integrity** | **§22** (`contentHash` on revision + acceptance) |
| **Versioning + immutability** | **§5, §16.2** |
| **Workflow** | **§6** |
| **Diff + rollback** | **§7, §17.10** |
| **Jurisdiction + metadata** | **§8, §16.1** |
| **UDD backend** | **§9, §16.4, §17.5–17.6, §17.11** |
| **Legal hold** | **§23** |
| **Async / jobs** | **§24** |
| **Re-consent execution** | **§25** |
| **Multi-tenant** | **§26** |
| **Analytics** | **§17.12, §27** |
| **Abuse / rate limits** | **§10** |
| **SEO** | **§11** |
| **Fallback + CDN** | **§12** |
| **Audit** | **§13** |
| **Preview** | **§14, §17.2** |
| **Slug invariants** | **§15** |
| **Testing** | **§30** |
| **Strong consistency + races** | **§33, §12** |
| **Idempotency** | **§34** |
| **Distributed publish safety** | **§35** |
| **DR + restore** | **§36** |
| **Integrity audit job** | **§37** |
| **`effectiveAt` semantics** | **§38** |
| **Grace → strict** | **§39** |
| **Audit immutability** | **§40** |
| **Multi-service enforcement** | **§41** |
| **App version matrix** | **§42** |
| **Deletion SLA** | **§44** |
| **Re-consent delivery proof** | **§45** |
| **Pre-ship operational / audit risks** | **§59** — authoritative gate before code freeze on *design* |

**Prioritized v1 build order:** (1) revisions + `contentHash`, (2) **§33** DB-authoritative accept/publish, (3) **§34** idempotency on accept + deletion + publish, (4) acceptance API, (5) **enforcement middleware** + `enforcementMode` + **§38–39**, (6) **§35** publish CAS / lock, (7) deletion requests + **legal hold** + **§44** SLA, (8) **background jobs** (purge, deletion, **§37** integrity, **§25** fan-out), (9) **§17.12** analytics, (10) **§40–41** audit + cross-service package as you split services.

**Design freeze:** Do not expand this specification with new architecture unless legal/security/regulator demands it. Use **§59** as the last checklist; further work = **schemas, APIs, middleware, jobs, tests** (implementation discipline).

---

## 21. Consent enforcement layer

**Problem:** Recording acceptance without **blocking** outdated users leaves the system as *evidence-only*, not *operational compliance*.

### 21.1 Configuration

| Source | Field |
|--------|--------|
| Env / feature flags / `legal_config` doc | `enforcementMode: 'strict' \| 'soft'` |

- **`strict`:** If `GET /api/v1/legal/me/status` implies `mustReaccept === true` for any required policy, **reject** requests outside an allowlist (see below) until user accepts via **§17.3**.
- **`soft`:** Log + return header `X-Legal-Reconsent-Required: 1` but allow traffic (transitional / phased rollout).

### 21.2 Server placement

- **Express:** `requireLegalAcceptance` middleware after auth, before business handlers.
- **Allowlist (always permit in strict mode):** `GET /api/v1/legal/policies/*`, `GET /api/v1/legal/me/status`, `POST /api/v1/legal/accept`, `POST /api/v1/auth/*`, session refresh, static health, logout.
- **Next.js BFF:** If webapp proxies mutations, same check on route handlers that map to protected actions.

### 21.3 Product matrix

| Mode | Reads | Writes |
|------|-------|--------|
| strict + mustReaccept | Allow read-only endpoints | Block writes |
| soft | All | All + warn |

Document exact path allowlists per service in implementation PR.

---

## 22. Content hash & snapshot integrity

**Problem:** `version` + `revisionId` alone do not prove the **exact body** the user saw if any bug or manual DB edit mutates text.

### 22.1 Rules

- On **freeze** (approve or publish step — pick one canonical moment), compute `contentHash = SHA-256(canonicalBytes)` over a **normalized** representation (UTF-8 NFC, consistent newline, stable field order: `title\n\nsummary\n\nbody`).
- Persist `contentHash` on **`legal_policy_revisions`** (required).
- On **accept**, copy `contentHash` into **`user_legal_acceptances`** (required).
- Public **§17.1** may optionally echo `contentHash` for client verification.

### 22.2 Disputes / audits

Compliance can verify: `hash(revision.body_snapshot) === acceptance.contentHash`.

---

## 23. Legal hold & retention overrides (UDD)

**Problem:** Some users **must not** be deleted while under investigation or statutory retention.

### 23.1 Fields (on `data_deletion_requests` — see **§16.4**)

- `legalHold: boolean`
- `legalHoldReason?`, `legalHoldSetById?`, `legalHoldSetAt?`, `legalHoldClearedAt?`

### 23.2 Behavior

- While `legalHold === true`, status may stay `processing` or move to a sub-state **blocked** (product: either extend status enum or use `notes` + `legalHold`).
- Completing deletion **requires** `legalHold === false` or explicit override permission `legal:override_hold` with audit.

---

## 24. Background jobs & async processing

**Problem:** Publish, CDN purge, deletion execution, and re-consent fan-out **must not** run inline on the HTTP thread at scale.

### 24.1 Recommended stacks (pick one)

| Stack | Use when |
|-------|----------|
| **BullMQ + Redis** | Already have Redis; familiar job retries. |
| **Cloud tasks** (SQS / Cloud Tasks) | Managed scale, no Redis coupling. |
| **Cron + DB queue table** | Minimal footprint; weaker retry semantics. |

### 24.2 Job types (minimum)

| Job name | Trigger | Action |
|----------|---------|--------|
| `LEGAL_POLICY_PUBLISHED` | Successful publish | Invalidate CDN keys; warm cache; enqueue **§25** if `isMajor`. |
| `LEGAL_RECONSENT_FANOUT` | `isMajor` publish | Batch query users with `acceptedVersion < version`; enqueue email/push; update materialized **pending** counts for **§17.12**. |
| `DATA_DELETION_PROCESS` | Status → `processing` | Orchestrate account wipe per retention doc; respect **§23** hold. |
| `LEGAL_ANALYTICS_ROLLUP` | Hourly | Refresh aggregates for **§17.12**. |
| `LEGAL_INTEGRITY_AUDIT` | Daily / weekly | Recompute **§22** hashes vs DB — **§37**. |

Idempotency keys: `revisionId` for publish jobs; `requestId` for deletion jobs. HTTP **§34** uses header-scoped keys separately.

### 24.3 Job idempotency & message replay (required)

Queues are **at-least-once**. Without dedupe, the same job can **double-publish side effects**, **double-delete**, or duplicate fan-out.

| Requirement | Detail |
|-------------|--------|
| **Stable job id** | Derive from domain key: e.g. `legal:publish:{revisionId}`, `legal:deletion:{requestId}`, `legal:integrity:run:{date}`. BullMQ `jobId` / SQS deduplication id / unique index on a `jobDedupeKey` collection. |
| **Handler semantics** | Every handler must be **safe to run twice** (read current state, no-op if already done) **or** acquire a short DB/Redis lock keyed by the same id before side effects. |
| **Cross-link** | Pairs with **§34** (HTTP idempotency) and **§49** (`executionSteps` for long sagas). |

---

## 25. Re-consent campaign execution

**Problem:** `isMajor` without **execution** is inert.

### 25.1 On publish (`isMajor: true`)

1. Persist revision (immutable).
2. Enqueue **§24** `LEGAL_RECONSENT_FANOUT`.
3. Set platform flag or per-user cursor: “required terms version = N”.
4. **§17.4** immediately reflects `mustReaccept` for affected users.
5. **§21** blocks (strict) or warns (soft).

### 25.2 Channels

- Email template with deep link to `/settings/legal` or modal.
- Optional push / in-app banner; webapp polls **§17.4** on session start.

---

## 26. Multi-tenancy & product context

**When:** Multiple products or tenants share one API.

### 26.1 Schema (see **§16.1**)

- `tenantId?: ObjectId`
- `productId?: string`

**Uniqueness:** `{ tenantId, productId, kind, region, locale }` replaces single global unique on `kind` alone when enabled.

### 26.2 API

- Public reads pass `X-Product-Id` or derive from host mapping.
- Admin scopes all legal mutations by `tenantId` + RBAC.

---

## 27. Legal analytics & visibility

Beyond **§17.12**, define:

- **Time-series:** acceptances per day per version (warehouse or Mongo aggregation).
- **Funnel:** published vN → accepted vN within 7d / 30d.
- **Ops dashboard:** open deletion requests, active legal holds.

**Privacy:** aggregate analytics only in v1; no per-user PII in analytics API without separate permission.

---

## 28. Deleted users & account lifecycle

### 28.1 Scenarios

| Scenario | Spec expectation |
|----------|------------------|
| User requests deletion, request `completed`, user row **hard-deleted** | Recreate account = **new** `userId`; no resurrection of old acceptances. |
| **Soft delete** (account disabled) | Same `userId`; acceptances retained until retention policy purges logs. |
| User requests deletion then **logs in again** before completion | Define product rule: **cancel** pending request on successful login vs **block** login until request withdrawn — document in app UX. |

### 28.2 Auth edge cases

- If email is reused for a new account, treat as **new userId** (never merge legal acceptance rows across unrelated accounts).

---

## 29. Policy dependencies

Some policies **logically** depend on others (e.g. Privacy references Terms definitions).

### 29.1 Schema

On **`legal_policy_revisions`** (optional):

```ts
requiresPolicyVersions?: { terms?: number; privacy?: number; udd?: number };
```

### 29.2 Enforcement

- **Publish validation:** reject publish if referenced kinds’ **current published** `version` is lower than required (or auto-bump copy — prefer **reject** for clarity).
- **Admin UI:** show dependency graph before approve.

---

## 30. Testing strategy

**Minimum automated coverage:**

| Area | Tests |
|------|--------|
| Version / accept | Accept stale `version` → **409**; accept current + hash match → **200**. |
| Enforcement | `mustReaccept` + `strict` → `POST /write` **403**; `GET /legal/me/status` **200**. |
| Hash | Mutate revision body in DB (fixture) → verify mismatch vs stored `contentHash` surfaces integrity check. |
| Rollback | Re-publish prior `revisionId` → public read returns old body + new version bump in audit. |
| Deletion | Legal hold blocks completion; clear hold → job completes. |
| Rate limit | Second deletion within cooldown → **429**. |
| Preview | Expired token → **401**. |
| **Strong consistency** | Accept after publish: assert DB `revisionId` matches accept payload; simulate stale cache → still **409** if DB says stale (**§33**). |
| **Idempotency** | Same `Idempotency-Key` twice → identical **200** body, single side-effect (**§34**). |
| **effectiveAt** | `now < effectiveAt` → public GET returns prior revision content (**§38**). |
| **Grace + enforce** | Day 0 soft → after `gracePeriodDays` strict blocks writes (**§39**). |
| **Integrity job** | `LEGAL_INTEGRITY_AUDIT` flags drift (**§37**). |
| **Publish CAS** | Concurrent publish attempts → one wins, one **409** (**§35**). |
| **Clock** | Compare `effectiveAt` / SLA using **§47** DB `now`, not skewed app `Date.now()` only. |
| **Accept replay** | Reuse consumed nonce / expired accept intent → **401** or **409** (**§48**). |
| **Deletion saga** | Fail mid-pipeline → retry resumes from `executionSteps` without double-delete (**§49**). |
| **Bootstrap** | Empty DB → `/health/legal` **503** until seed policies exist (**§56**). |
| **Idempotency conflict** | Same `Idempotency-Key`, different body → **409** `IDEMPOTENCY_CONFLICT` (**§34**). |
| **Job replay** | Same BullMQ `jobId` / dedupe key → second run no-ops or skips completed steps (**§24.3**, **§49**). |

Run in CI on every PR touching `legal/*`.

---

## 31. Additional schema & metadata fields

Consolidating **medium** improvements (also reflected in **§16** where noted):

| Field | Location | Purpose |
|-------|----------|---------|
| `publishedById` | `legal_policy_revisions` | Distinct from `approvedById` — who executed publish (**§16.2**). |
| `visibility` | `legal_policies` | `'public' \| 'internal'` — internal-only clauses / staff policies. |
| `searchIndex` | `legal_policies` (draft) | Denormalized plain text for admin search. |
| `readTimeMinutes` | derived or stored | UX + analytics. |
| `acknowledgementType` / `acknowledgementTypeDefault` | acceptance row / policy | `checkbox` \| `implicit` \| `scroll_required` for evidential UX. |

---

## 32. Architectural framing & maturity scorecard

**Framing:** The system is not “CMS pages” — it is **legal infrastructure**: **compliance + enforcement + audit + async operations**.

**Target posture (scale):** **Strongly consistent** at the legal API surface · **Eventually consistent** in async jobs · **Cryptographically verifiable** (hashes) · **Failure-resilient** (DR, idempotency, locks).

| Category | Score (design) | Gap until shipped |
|----------|----------------|-------------------|
| System design | 9.5/10 | **§33–§35** wired in code |
| Compliance readiness | 9/10 | **§21–23** + **§38–39** |
| Real-world robustness | 8.5/10 | **§34**, **§36–37**, **§44** |
| **Distributed safety** | ⚠️ main gap | **§35** + **§41** |
| Architecture (prior) | 9/10 | Implement **§16–17** + **§24** |
| Scalability | 8.5/10 | Jobs + analytics rollups |
| **Biggest implementation risk** | — | Half-implemented enforcement worse than none — ship **§21** with `soft` first if needed |

**Straight talk:** You’ve crossed from “feature design” to **infrastructure design**. **§33–§35** are what move this from *single-service correct* to *audit-defensible under races and retries*.

**Next tier (ops excellence):** **§47–§56** — time, replay safety, sagas, observability, backpressure, bootstrap. **§58** updates scores after those are shipped.

**Stop condition:** **§59** lists the only remaining *real-world* failure modes; after they are implemented and tested, **do not** keep adding fields or sections — ship and iterate in code.

---

## 33. Strong consistency & legal correctness

**Failure mode:** Publish → cache not purged yet → user “accepts” while UI still shows old text → acceptance row points at a **revision** that is no longer the latest **intent** of the platform, or double-writes under race.

### 33.1 Rules

1. **`POST /legal/accept` and publish paths** read **current published `revisionId` + `contentHash` from Mongo** (primary, `readConcern: majority` or equivalent) — **never** from CDN / edge / in-process cache alone. **Accept MUST reject or 409 if the client’s claimed revision/hash does not match the DB row** — cache staleness is never an excuse to persist a wrong acceptance (**§59** item 6).
2. Attach **`publishTransactionId`** (UUID) to each successful publish; store on **`legal_policy_revisions`** (and echo in audit + optional response header). Acceptances and jobs may log it for traceability.
3. **Jobs (§24)** are **eventually consistent** (purge, email fan-out). **Legal truth** = DB row + immutable revision chain.

### 33.2 Accept validation

- Reject accept if `revisionId` is not exactly the **current published** revision for that `kind` (or not yet effective per **§38**), or if `contentHash` mismatch vs DB.

---

## 34. Idempotency for critical APIs

**Failure mode:** Mobile retries → duplicate acceptances, duplicate deletion requests, double publish.

### 34.1 Header

Clients send: **`Idempotency-Key: <uuid>`** on:

- `POST /api/v1/legal/accept`
- `POST /api/v1/legal/data-deletion-requests`
- `PATCH .../admin/legal/policies/:id` with `action: publish` (optional but recommended)

### 34.2 Storage (example collection `legal_idempotency_keys`)

| Field | Purpose |
|-------|---------|
| `key` | Unique idempotency key |
| `route` | e.g. `POST /legal/accept` |
| `actorUserId` | if authenticated |
| `requestHash` | hash of normalized body |
| `responseSnapshot` | stored JSON + HTTP status |
| `createdAt` | TTL 24–72h |

**Behavior:** Same key + same `requestHash` → return **stored** response (HTTP identical). Same key + **different** body → **409** `IDEMPOTENCY_CONFLICT`.

---

## 35. Distributed locking & publish guards

**Failure mode:** Two admins publish concurrently → two “current” revisions or torn state.

### 35.1 Beyond `lockedById`

- **Short-lived Redis lock** key `legal:publish:{policyId}` OR
- **Mongo compare-and-set:** publish only if `expectedPublishedRevisionId === legal_policies.publishedRevisionId` and `status === approved`.

### 35.2 Config

- `versionCheckOnPublish: true` (default) — reject publish if working copy base revision drifted since editor opened.

---

## 36. Disaster recovery & restore

**Legal data is non-lossable.**

### 36.1 Backups

- Include **`legal_policies`**, **`legal_policy_revisions`**, **`user_legal_acceptances`** (and **`data_deletion_requests`**) in **point-in-time** backup / replica strategy with RPO/RTO documented.

### 36.2 Restore operations

- **`restoreRevision(revisionId)`** (admin-only, audited): re-point `legal_policies.publishedRevisionId` to a **known-good** past revision (new publish event; optionally bump `version` with `changeLog: "DR restore"`).
- Never hard-delete revision rows; **supersede** only.

---

## 37. Tamper detection & periodic integrity audit

`contentHash` (§22) is useless if never verified.

### 37.1 Job: `LEGAL_INTEGRITY_AUDIT` (§24)

- For each published revision sample (or all on schedule), **recompute** canonical hash from stored `body`.
- If `computed !== contentHash` → **alert** + audit `legal.integrity.drift_detected` + freeze publish for that policy until human clears.

**Production requirement:** This job is **not optional** in production — without it, **§22** hashes are evidence that is never verified (**§59** item 18).

---

## 38. Time-based policy activation (`effectiveAt`)

**Failure mode:** `publishedAt` today, `effectiveAt` next week — users must not be bound to new text **before** effective instant.

### 38.1 Public read rule

- If `now < effectiveAt` for the newest published revision, **`GET /legal/policies/:kind`** returns the **prior** published revision’s body/metadata (still 200), **or** returns new revision with `effectiveAt` and `isPendingEffect: true` — **pick one contract** and document; recommended: **serve prior revision content** until `effectiveAt`, then switch atomically. **`now` must use the same authoritative clock as §47** (never ad-hoc app server wall clock in isolation).

**Final rule (required):** Do **not** treat the newly published revision as **legally binding for consent or enforcement** until `effectiveAt` has passed per **§47**. Until then users see and accept the **prior** revision (or explicit `isPendingEffect` contract with legal sign-off). Mis-timed enforcement is an **audit failure** (**§59** item 16).

### 38.2 Enforcement (§21)

- `mustReaccept` should align with **legally binding** revision (usually the one whose `effectiveAt` has passed), not the “preview published” row.

---

## 39. Grace period before strict enforcement

Instant **strict** block on major publish causes drop-offs and support load.

### 39.1 Schema

- `gracePeriodDays` on **`legal_policies`** (or per-major publish on revision metadata).

### 39.2 Flow

1. Major publish → **§25** notifications; **§21** = `soft` or “warn-only” for `gracePeriodDays`.
2. After deadline → flip to **`strict`** (job or cron) for users still on `acceptedVersion < required`. **Deadline comparison MUST use §47 DB time** (same clock as `effectiveAt` / SLA), not per-node `Date.now()` in isolation — prevents “blocked too early / too late” across instances (**§59** item 17).

---

## 40. Audit immutability

**Risk:** Audit rows mutable → compliance story collapses.

### 40.1 Rules

- **Append-only** `AuditLog` / legal audit stream — no updates/deletes except GDPR-compliant redaction process (document separately).
- Optional **hash chain:** each row stores `prevHash`, `rowHash = H(prevHash + payload)` for tamper evidence.
- Optional **ship to WORM / SIEM** for enterprise.

Cross-reference **§13** action names.

### 40.2 Implementation requirements (audit-defensible)

| Requirement | Detail |
|-------------|--------|
| **No in-place mutation** | Application code must **INSERT** audit rows only — no “fix typo” UPDATEs on legal audit collections. |
| **Database posture** | Where supported, DB role for app user: **INSERT-only** on audit table; **no UPDATE/DELETE** (except dedicated redaction job principal). |
| **Hash chain** | Treat as **recommended** once you rely on audit in disputes; without chain or external WORM, “DB admin edited row” remains a residual risk (**§59** item 14). |

---

## 41. Cross-service enforcement

**Risk:** Monolith enforces **§21**; new microservice forgets → compliance hole.

### 41.1 Shared package

- Publish internal npm (or monorepo package) **`@company/legal-enforcer`** (name illustrative): exports `assertLegalGate({ userId, route, method })` calling **central** `/legal/me/status` or a signed **JWT claim** minted at login that embeds `legalClaims: { termsVersion, mustReaccept }` with short TTL.

### 41.2 Pattern

- **API gateway** or **edge auth** enforcement preferred (one choke point) vs N copies — if N services, **shared package + contract tests** required. **No service may skip** the gate for user-mutating routes unless explicitly allowlisted and documented (**§59** item 15).

---

## 42. Client / API version negotiation

**Edge case:** Mobile app ships old binary referencing old policy UX.

### 42.1 Header

- Client sends **`X-App-Version: semver`** (or build number).

### 42.2 Server rules (product-defined)

- Map to **compatibility matrix**: e.g. app &lt; N **must** upgrade for write paths, or **must** open in-app WebView to accept latest.
- Return **`X-Legal-Min-App-Version`** when blocking.

---

## 43. Event sourcing option

For **bulletproof** audits, optionally append immutable domain events:

- `POLICY_CREATED`, `POLICY_SUBMITTED_REVIEW`, `POLICY_APPROVED`, `POLICY_PUBLISHED`, `USER_ACCEPTED`, `DELETION_REQUESTED`, …

**Materialized read model** = current `legal_policies` row. **Replay** reconstructs state — higher engineering cost; adopt if regulated industry demands.

---

## 44. Deletion SLA tracking

| Field | Location |
|-------|----------|
| `slaDeadline` | `data_deletion_requests` — e.g. `requestedAt + 30d` per policy |
| `slaBreached` | boolean, set by cron if `now > slaDeadline` and status not terminal |

Expose in **§17.11** admin queue + analytics (**§27**).

### 44.1 Enforcement (required)

- A scheduled job (or equivalent) MUST evaluate `slaDeadline` against **§47** `now` and set `slaBreached: true` when past deadline and status is not terminal.
- **§54** MUST alert on breach count / aging queue — silent backlog = compliance exposure (**§59** item 20).

---

## 45. Re-consent notification & delivery tracking

**Question:** Did the user **see** the prompt, not only receive email?

### 45.1 Optional table `legal_reconsent_notices`

- `userId`, `targetVersion`, `channel` (`email` \| `push` \| `in_app`)
- `sentAt`, `deliveredAt`, `openedAt`, `clickedAt`, `dismissedAt`
- Links **§25** campaigns to **§17.12** funnels (“pending” = no `acceptedAt` for target version).

---

## 46. Optional policy A/B rollout

**Rare / advanced:** Canary new Terms to **10%** of users (feature flag bucket) before full `isMajor` blast.

- Requires **versioning per cohort** or shadow `revisionId` per bucket — high complexity.
- **Default:** do not implement until legal approves differential treatment.

---

## 47. Clock consistency & authoritative time

**Problem:** `effectiveAt`, `gracePeriodDays`, SLA deadlines, and “pending effect” comparisons all depend on **time**. If each app server uses its own wall clock, enforcement drifts across instances and is hard to defend in audit.

### 47.1 `timeSource` (design contract)

```ts
timeSource: 'db' | 'ntp_synced';
```

| Mode | Rule |
|------|------|
| **`db` (recommended default)** | All enforcement comparisons use **database server time** — e.g. MongoDB `$$NOW` in aggregation, or read `SELECT NOW()` / equivalent once per request at the **legal boundary** and pass that timestamp into business logic. **Never** branch on `Date.now()` alone for “is this revision in effect?” |
| **`ntp_synced`** | App fleet is contractually NTP-correct within tight skew; still **prefer DB `NOW()`** for writes that must align with stored `Date` fields. |

### 47.2 Implementation notes

- **Single source of truth per request:** e.g. `const now = await clock.now()` where `clock` wraps DB or a small internal time service.
- **§38 `effectiveAt`:** comparisons use the same `now` as **§47** (already referenced in **§38.1**).
- **Jobs / cron:** schedule triggers may use worker clock, but **SLA breach** checks should compare stored `slaDeadline` to **§47** `now` from DB when marking `slaBreached`.

---

## 48. Replay protection for accept API

**Threat:** Attacker **replays** a captured `POST /legal/me/accept`** (or equivalent) with a still-valid bearer token, even if idempotency keys differ — producing duplicate evidence or confusing “when did the user really act?” in disputes.

### 48.1 Mitigations (layer)

| Layer | Mechanism |
|-------|-----------|
| **Short-lived accept token** | Issue `acceptIntentToken` (JWT or opaque) bound to `userId`, `revisionId`, `contentHash`, **`expiresAt`**, optional **`jti` / nonce**; **POST accept** requires that token **or** a one-time server-stored nonce consumed on success. |
| **Session binding** | Accept intent tied to **current session id** / refresh rotation — replay from another device fails unless attacker holds full session. |
| **Freshness** | Reject accept if `issuedAt` of intent is older than **N minutes** vs **§47** `now`. |
| **Idempotency** | **§34** still applies for legitimate retries; **nonce** prevents *cross-context* replay, not the same client retrying safely. |

### 48.2 Optional schema (server-side intent)

```ts
legal_accept_intents: {
  _id: ObjectId;
  userId: ObjectId;
  revisionId: ObjectId;
  nonce: string;       // single-use
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}
```

Index: `{ nonce: 1 }` unique sparse; TTL on `expiresAt` for cleanup.

---

## 49. Job sagas: partial failure & execution steps

**Problem:** `DATA_DELETION_PROCESS` touches multiple services (profile, orders, search, backups, third parties). Failure at step 3 leaves **ambiguous state** — retries may double-delete or skip.

### 49.1 `executionSteps` (on `data_deletion_requests` — see **§16.4**)

Persist **ordered steps** with status:

```ts
executionSteps?: {
  step: string;  // e.g. 'delete_profile', 'delete_orders', 'purge_search', 'notify_processors'
  status: 'pending' | 'done' | 'failed';
  at?: Date;
  error?: string;
}[];
```

**Worker rule:** always resume from the **first** `pending` or `failed` step (with idempotent downstream APIs). **Never** assume “all or nothing” without recording progress.

### 49.2 Tests

Add to **§30:** simulate failure after step 2 → retry completes steps 3–N without corrupting 1–2.

---

## 50. Compensation & permanent job failure

**Problem:** After partial deletion (**§49**), the job may **permanently** fail (vendor outage, unrecoverable error).

### 50.1 Strategies

| Strategy | When |
|----------|------|
| **Retry with backoff** | Transient errors — standard queue policy. |
| **Mark `compensationStatus: 'partially_completed'`** | Honest terminal state + **§17** audit entry (“deletion incomplete: steps X–Y done”). |
| **Manual recovery queue** | `'manual_recovery_required'` — operator runbook (legal + eng). |
| **Restore from backup** | Rare; only if policy/legal allows **and** backups are not yet purged — document as exception, not default. |

### 50.2 No silent “rollback” of user-visible deletion

Prefer **transparent partial state** + human process over pretending full deletion when it is not true.

---

## 51. Schema migration & backward compatibility

**Problem:** Collections and API payloads evolve; old mobile apps and cached workers still send old shapes.

### 51.1 Rules

- **`schemaVersion`** on **`legal_policies`** (and optionally revisions) — **§16.1** — bump when adding required fields or changing semantics.
- **Backward compatibility:** new fields optional; deprecate over **two** release trains where possible; **§42** `minLegalClientVersion` for breaking changes.
- **Migrations:** versioned scripts (e.g. `migrations/legal/0007_add_execution_steps.ts`); run in CI/staging first; **feature flag** risky migrations.
- **Read path:** if `schemaVersion` missing, treat as `0` or `1` per convention — document in **§17** runbook.

---

## 52. PII minimization for acceptance & telemetry

**Risk:** Storing raw `ipAddress` / full `userAgent` indefinitely increases **GDPR/CPRA** surface and DSAR work.

### 52.1 Practices

| Data | Approach |
|------|----------|
| **IP** | Store **`ipAddressHash`** (HMAC with server secret + rotating salt) **or** truncated prefix + hash; define **retention** (e.g. 90d raw then hash-only). |
| **User-agent** | Store shortened UA or coarse **device class** after retention window. |
| **Acceptance row** | Keep `revisionId` + `contentHash` + timestamp **long**; trim volatile telemetry per **§22** DPA. |

### 52.2 Policy doc

Add **§17** admin/legal setting: `acceptanceLogRetentionDays`, `anonymizeAfterDays`.

---

## 53. Field-level permissions (legal metadata)

**Gap:** RBAC can gate “edit Terms” but not **which fields** on the policy metadata (e.g. `grievanceOfficer`, DPO contact, regulator IDs).

### 53.1 `fieldLevelPermissions` (concept)

```ts
fieldLevelPermissions?: Record<string, string[]>; // fieldKey -> admin permission slugs
// e.g. grievanceOfficerEmail -> ['legal.metadata.grievance.edit']
```

- **Admin UI:** hide/disable fields unless permission present.
- **API:** **403** on patch containing protected keys without permission.
- **Audit:** log field-level diffs for sensitive keys (**§17.10**).

---

## 54. Observability & monitoring

**Gap:** Design is complete on paper; **production** needs metrics and alerts.

### 54.1 Metrics (examples)

| Metric | Purpose |
|--------|---------|
| **Acceptance rate** (by `kind`, `version`) | Campaign health |
| **Re-consent failure rate** | UX / comms issues |
| **Deletion SLA breaches** | `slaBreached === true` count (**§44**) |
| **Publish latency** | `submittedAt` → `publishedAt` p95 |
| **Integrity audit drift** | Count from **§37** job |
| **Job retry exhaustion** | Dead-letter rate for legal jobs |

### 54.2 Alerts

- Integrity audit detects hash mismatch (**§37**).
- Publish failed / CAS conflict spike (**§35**).
- Webhook or job queue depth over threshold (**§41**).
- **§55** — sustained **429** on `/legal/me/status` (capacity).

---

## 55. Backpressure & load shedding

**Scenario:** Major policy update → millions of clients poll **`GET /legal/me/status`** or hit forced modal.

### 55.1 Tactics

| Tactic | Detail |
|--------|--------|
| **Short-TTL cache** | CDN or edge cache **only** if response is **non-user-specific** or use **ETag** + `Cache-Control: private, max-age=60` for authenticated status. |
| **Batch / fan-out** | Prefer **push** or periodic refresh over tight polling (**§45**). |
| **Rate limits** | Per-user and per-IP limits on status + accept-intent issuance. |
| **Computed rollups** | **§27** — precompute “% pending re-consent” instead of ad-hoc heavy queries. |

---

## 56. Cold start & bootstrap

**Problem:** Fresh deploy has **no** published Terms/Privacy → product cannot ethically run.

### 56.1 Mandatory seed

- **Seed migrations** insert `terms` + `privacy` (and `udd` if required) **published** revisions with `version: 1`, `contentHash`, and `status: 'published'`.
- **Health check:** API `/health/legal` fails (503) if **required kinds** missing published revision — **blocks traffic** behind load balancer or fails deploy pipeline.
- **§56** is non-optional for production **go-live checklist**.

---

## 57. Ultra-advanced options

Optional “elite tier” — adopt only with legal + security sign-off.

| Option | Idea |
|--------|------|
| **Cryptographic signing** | `signature = sign(contentHash, privateKey)` — HSM-held key; verify on read path; detects insider DB tamper beyond hash. |
| **Zero-trust audit logs** | Ship **§17** / **§23** events to **immutable external** store (WORM bucket, SIEM); periodic independent verification. |
| **Legal simulation mode** | Shadow compute “who would need re-consent” before publish — no user-facing change; metrics for projected drop-off. |
| **User trust transparency** | Settings UI: “You accepted **Terms v12** on **2026-04-01**” with link to archived PDF/markdown — strengthens UX + disputes. |

---

## 58. Production maturity scorecard (final)

After **§47–§57** are reflected in implementation and runbooks:

| Category | Score (design) |
|----------|----------------|
| Architecture | 9.7/10 |
| Compliance readiness | 9.5/10 |
| Distributed safety | 9/10 |
| Production readiness | 9/10 |

**Framing:** Correctness + integrity + idempotency + jobs + DR are **table stakes** at this depth. **Operational maturity** — **time-consistent**, **replay-safe**, **failure-recoverable**, **observable**, **backpressure-aware**, **bootstrap-safe** — is what separates “shipped feature” from **audit-defensible platform**.

**Next step:** Close design churn. Implement **§59** as a release gate; track gaps in tickets, not new spec sections.

---

## 59. Final production risks checklist & design freeze

This section is the **authoritative pre-ship list** of what can still break the system in **production** or **audit** after **§1–§58**. It does not re-explain solved areas (versioning, consent rows, rollback, preview, multi-tenancy, analytics patterns).

### 59.1 Design freeze

- **Specification:** Treat **§1–§59** as **design-complete**. Further “improvements” belong in **code, runbooks, tests, and migrations** — not endless spec expansion (avoids over-engineering loops).
- **Exceptions:** Re-open design only for **legal**, **security**, or **regulator-mandated** deltas; record them with ADR + version bump to **§51** `schemaVersion` / API contract.

### 59.2 The twenty production risks (must ship correctly)

| # | Risk | Required mitigation | Primary § |
|---|------|----------------------|-----------|
| 1 | **Clock drift** — different servers, different `now` | Always use **DB time** (`NOW()` / `$$NOW` / single `clock.now()` from DB per request). Never rely on bare `Date.now()` for `effectiveAt`, grace, or SLA. | **§47**, **§38–39**, **§44** |
| 2 | **Accept API replay** | One-time **nonce / accept intent** or short-lived **signed token** bound to `revisionId` + user + expiry (**§48**). | **§48** |
| 3 | **Partial deletion corruption** | **`executionSteps`** + resume-safe workers (**§49**). | **§49** |
| 4 | **Unclear terminal state for jobs** | **`compensationStatus`**, manual recovery queue — **never** fake `completed` if work is partial (**§50**). | **§50** |
| 5 | **Concurrent publish race** | **CAS** on `publishedRevisionId` / `version` **or** short **Redis lock** (**§35**). | **§35** |
| 6 | **Cache vs DB mismatch on accept** | Accept path validates **`revisionId` + `contentHash` against Mongo primary** only; mismatch → **409** (**§33**). | **§33** |
| 7 | **No bootstrap / empty legal** | Mandatory **seed** + **`/health/legal` fails** (e.g. 503) until required kinds exist (**§56**). | **§56** |
| 8 | **Job message replay** | Stable **`jobId` / dedupe key** from `revisionId`, `requestId`, or run bucket; handlers **idempotent** (**§24.3**). | **§24.3** |
| 9 | **PII over-collection** | **Hash / minimize IP**; **retention** for raw telemetry (**§52**). | **§52** |
| 10 | **Silent failures** | **Metrics + alerts**: SLA breach, integrity drift, publish failures, job DLQ (**§54**). | **§54** |
| 11 | **Backpressure / thundering herd** | **Rate limits**, **short private TTL / ETag**, **batch notifications** over tight polling (**§55**, **§45**). | **§55** |
| 12 | **Schema drift breaks clients** | **`schemaVersion`**, backward-compatible rules, **§42** for breaking changes (**§51**). | **§51** |
| 13 | **Over-privileged admin edits** | **Field-level permissions** on sensitive metadata (**§53**). | **§53** |
| 14 | **Audit rows mutable** | **Append-only** writes; DB **INSERT-only** role where feasible; **hash chain** or **WORM export** for strongest posture (**§40**). | **§40** |
| 15 | **Service forgets enforcement** | **Gateway** or **`@company/legal-enforcer`** + **contract tests** on every service (**§41**). | **§41** |
| 16 | **`effectiveAt` misuse** | **Prior revision** served until `effectiveAt`; enforcement aligns with binding revision (**§38**). | **§38** |
| 17 | **Grace period logic drift** | Strict flip **after** grace interval using **same §47 clock** as publish time (**§39**). | **§39** |
| 18 | **Integrity hash never verified** | **`LEGAL_INTEGRITY_AUDIT`** scheduled in prod (**§37**). | **§37** |
| 19 | **Idempotency key abuse** | Same key + different body → **409 `IDEMPOTENCY_CONFLICT`** (**§34**). | **§34** |
| 20 | **Deletion SLA not enforced** | **`slaBreached`** + monitoring / alerting on stuck requests (**§44.1**, **§54**). | **§44** |

### 59.3 Explicitly complete — do not re-open as “gaps”

Already specified end-to-end; **do not** keep redesigning these in the abstract:

Versioning; consent tracking; enforcement model; audit event taxonomy; rollback; preview tokens; multi-tenancy hooks; analytics materializations; async job *types*.

### 59.4 Final status

| Area | Status |
|------|--------|
| Design completeness | **~99%** — bounded by **§59.2** implementation proof |
| Remaining risk | **Operational** — wrong or partial implementation |
| Need for more fields | **No** — unless product/regulator adds a requirement |
| Need for architecture redesign | **No** |

### 59.5 What to do next (implementation order)

1. **Mongo / Mongoose schemas** (**§16**) + migrations (**§51**).  
2. **REST APIs** (**§17**) + **§33–§35** correctness on publish/accept.  
3. **Enforcement middleware** (**§21**) + **§41** gateway or package.  
4. **Jobs** (**§24**, **§24.3**, **§37**, **§44.1**, **§49–§50**).  
5. **Tests** (**§30**, **§59.2** matrix).  

### 59.6 One-line summary

The system is **production-ready in design**; the only material risk left is **implementation discipline**, not missing architecture.

---

*Document merges principal-engineer review: **§33–§46** (consistency, idempotency, distributed locks, DR, integrity audit, effectiveAt semantics, grace period, audit immutability, cross-service enforcement, app version negotiation, event sourcing option, deletion SLA, re-consent tracking, A/B note) plus **§47–§58** (clock source, accept replay protection, deletion sagas + compensation, schema migration, PII minimization, field-level RBAC, observability, backpressure, bootstrap, ultra-advanced options, final scorecard) and **§59** (final twenty risks, design freeze, implementation gate). Prior edits: **§12** invariant, **§16** `gracePeriodDays`, `publishTransactionId`, deletion SLA fields, `executionSteps` / `schemaVersion`, acceptance hash fields, **§20** / **§30** / **§32** / **§33** / **§38–§41** / **§44** tightening, **§24.3** job dedupe.*
