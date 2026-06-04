# RBAC, user management, and admin platform specification

This document specifies a **production-ready, large-scale** role-based access control (RBAC) system for the **Syntax Stories admin** (`admin/`) and the **backend** (`server/`), including **user management**, **billing visibility**, **content metrics**, and **operational security**. It is written to align with **data you already persist** today and to describe the gap to a full employee-grade permission model.

**Audience:** engineering, security, and product owners implementing or reviewing the admin and internal APIs.

**Review addendum:** **§12** — v1 **scope lock**, **middleware**, **DTOs**, **limits**, **indexes**, **billing guardrails**, **audit shape**. **§13** — **DB shape**, **cache**, **allowlists**, **concurrency**, **soft delete**, **role levels**, **self-protection**, **pagination**, **deny logs**, **search rank**, **revoke sessions**. **§14** — **last 5%**: **Mongo transactions**, **idempotency store**, **audit retention/archive**, **error JSON contract**, **feature flags**, optional **bulk/jobs/monitoring** — then **stop spec work and build**.

**Related code today (inventory):**

| Area                        | Location / behavior                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| End-user + staff profile    | `server/src/models/User.ts` — profile, OAuth link flags/IDs, billing denorm fields, `staffRole` (`editor` \| `admin`), `staffPasswordHash`, `isActive`, security fields |
| Subscriptions               | `server/src/models/Subscription.ts` — plan, Stripe ids, periods, status, reconciliation fields                                                                          |
| Transactions / invoices     | `server/src/models/PaymentLedger.ts` — per-user ledger rows tied to Stripe invoice/payment intent                                                                       |
| Blog posts                  | `server/src/models/BlogPost.ts` — `authorId`, `status` (`draft` \| `published`), soft delete                                                                            |
| Sessions (online heuristic) | `server/src/models/Session.ts` — `userId`, `lastActiveAt`, `expiresAt`, `revoked`                                                                                       |
| Staff gate (coarse)         | `server/src/modules/help/requireStaff.middleware.ts` — JWT user must have `staffRole` in `editor` \| `admin`                                                            |

---

## 1. Goals and non-goals

### 1.1 Goals

- **Fine-grained RBAC** for admin operators: roles → permissions in **v1**; optional **scopes** only where justified (e.g. billing) — see **§12** for the locked “80% system” and what to defer.
- **User management**: searchable directory, **detail view**, **edit profile** (controlled fields), **account lock** (`isActive` / dedicated lock flag — see §6), **soft vs hard delete**, **email reset / verification flows** with audit.
- **OAuth visibility**: show **which providers are linked** (flags + masked external IDs where safe); **never** return OAuth **tokens** to the admin UI (they are `select: false` on `User` for a reason).
- **Billing context** on the user: subscription row, renewal / period end, cancel-at-period-end, trial, **ledger / transactions**, and (via Stripe) **default payment method** where applicable — all behind explicit permissions.
- **Content metrics**: at minimum **blog post counts** (published / draft / deleted) per user.
- **Reusable UI**: one **common data table** component (sorting, pagination, filters, column visibility, empty/loading states) used for users, transactions, role assignments, etc.
- **Search**: dedicated user search (email, username, id, name, Stripe customer id) with debounce and server-side indexing.
- **Auditability**: every sensitive admin action logged (who, what, target user, before/after where applicable).
- **Multi-tenant admin readiness**: structure roles and assignments so **each operator** can have different permissions; **super-admin** is optional and tightly controlled.

### 1.2 Non-goals (initial phase)

- Replacing Stripe as the source of truth for payment methods (admin **displays** and **links** to Stripe Dashboard or Customer Portal instead of duplicating PAN data).
- Building a full real-time “who is typing” presence system (optional later via WebSocket + heartbeat).

---

## 2. Current user data (what exists in DB)

The following is grounded in `User` and related models. Use this as the **admin “field catalog”** for read vs write vs never-expose.

### 2.1 Identity and profile (largely safe to show read-only to authorized admins)

- **Core:** `fullName`, `username`, `email`, `profileImg`, `profileImgAlt`, `coverBanner`, `coverBannerAlt`, `gender`, `job`, `bio`, `portfolioUrl`, social links (`linkedin`, `instagram`, `github`, `youtube`), `stackAndTools`.
- **Structured sections:** `workExperiences`, `education`, `certifications`, `projects`, `openSourceContributions`, `mySetup` (arrays with nested limits as in schema).

**Admin edit policy:** prefer **sectioned PATCH** mirroring public profile rules (versioning / conflicts) or a dedicated **admin override** path with stronger audit — product decision; spec recommends **admin override API** with `reason` + audit for bulk fixes. **Enforce `expectedProfileVersion`** on admin profile PATCH — see **§13.4**. **Whitelist fields** per permission — **§13.3**.

### 2.2 OAuth and linked accounts (show status, not secrets)

- **Flags:** `isGoogleAccount`, `isGitAccount`, `isFacebookAccount`, `isXAccount`, `isAppleAccount`, `isDiscordAccount`.
- **External IDs:** `googleId`, `gitId`, `facebookId`, `appleId`, `xId`, `discordId` (sparse indexes) — useful for support (**show last 4 chars** or hash prefix in UI; avoid full export).
- **Tokens:** `googleToken`, `githubToken`, etc. — **must not** appear in admin API responses. Admin actions that need token revocation should call **server-side** integrations that use stored secrets internally.

### 2.3 Account state and security

- `isActive` — primary **account enabled** flag; pair with product meaning of “locked” (see §6).
- `emailVerified`, `lastLoginAt`.
- `twoFactorEnabled` — boolean OK to show; `twoFactorSecret` **never** exposed.
- `profileVersion`, `profileUpdatedAt` — support concurrency if admin edits profile.

### 2.4 Billing denormalized on user (fast list views)

- `stripeCustomerId`
- `subscriptionStatus`, `subscriptionPlanKey`, `subscriptionPeriodEnd`, `lastSubscriptionReconciledAt`
- `subscription` → ObjectId ref to `subscriptions` collection

**Detail view** should **join** `Subscription` and optionally **aggregate** `PaymentLedger` for recent charges.

### 2.5 Social graph denorm

- `followersCount`, `followingCount` — display-only metrics.

### 2.6 Referrals

- `referralCode`, `referredByUserId`, `referredAt`, `referralSource`, `referralCapturedAt`.

### 2.7 Staff (today’s coarse RBAC)

- `staffRole`: `'editor' | 'admin'` — CMS/help access via `requireStaff`.
- `staffPasswordHash` — **never** returned; used only for `POST /auth/staff-login`.

**Gap:** this is **not** sufficient for resource-level RBAC; §4 defines the target model.

---

## 3. Related entities for “detailed user view”

### 3.1 Subscription (`subscriptions`)

Expose for admin (read): `plan`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `trialEnd`, `stripeSubscriptionId`, `stripePriceId`, `graceUntil`, `lastReconciledAt`, `source`, `metadata` (sanitized).

**Writes (guardrails — see §12.8):** **never** allow direct Mongo updates to subscription rows for “admin convenience.” Only allow **Stripe-aligned operations**: e.g. `triggerStripeSync()` / reconcile job, `cancelAtPeriodEnd` via Stripe, `grantTrial` via Stripe or a single blessed service path. Manual DB repair only under documented break-glass with audit.

### 3.2 Payment ledger (`payment_ledgers`)

List for user: `amountPaid`, `currency`, `status`, `paidAt`, `stripeInvoiceId`, links `hostedInvoiceUrl` / `invoicePdfUrl`, `description`, `lineSummary`.

### 3.3 Blog posts (`blogposts`)

Per user aggregates:

- Count **published** where `authorId = user` and `status = published` and `deletedAt` null.
- Count **drafts** similarly.
- Count **soft-deleted** (`deletedAt` set) if trash policy exposes them.

Optional: recent N posts (title, slug, status, `updatedAt`) for support.

### 3.4 Sessions (`sessions`) — “online” and device inventory

- **Online heuristic:** user is “recently active” if there exists a session with `revoked = false`, `expiresAt > now`, and `lastActiveAt` within a configurable window — **pick one value** (e.g. **2 or 5 minutes**) and document it; see **§12.6** for presence accuracy and middleware updates.
- **Device list:** non-revoked sessions with `deviceName`, `userAgent`, `ip`, `lastActiveAt`, `createdAt` — useful for “log out all devices” (if you add that admin action).

### 3.5 Audit (`AuditLog` and billing audit)

Use existing `AUDIT_ACTIONS` patterns; extend with **`admin.*`** actions (see §8).

---

## 4. Target RBAC model (recommended)

### 4.1 Terminology

| Concept                 | Meaning                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resource**            | A protected object class in the system, e.g. `user`, `help_article`, `subscription`, `payment_ledger`, `blog_post`, `admin_role`, `admin_assignment`. |
| **Action**              | Verb on a resource, e.g. `read`, `list`, `update`, `delete`, `lock`, `reset_email`, `assign_role`, `impersonate` (if ever).                           |
| **Permission**          | Resource + action (+ optional **field mask** for updates). Example: `user:read`, `user:update_profile`, `billing:read`.                               |
| **Role**                | Named bundle of permissions, e.g. `Support L1`, `Billing Analyst`, `Content Moderator`.                                                               |
| **Role assignment**     | Links **staff user** → **role** (+ optional **scope** JSON: e.g. `categories: ['billing']` or `tenantId` if multi-tenant later).                      |
| **Permission override** | Direct **user ↔ permission** grant or deny — **defer to post-v1** unless a concrete support need appears (see §12.1).                                 |

### 4.1a v1 RBAC scope (finishable “80% system”)

To avoid **over-flexible RBAC that never ships**, **v1** should implement:

- **Roles → permissions only** (many-to-many or equivalent).
- **No user-level permission overrides** (skip until a real use case).
- **Scopes** reserved for billing or a later phase — not required for first release.

Post-v1: add overrides and broader scopes only when operational pain justifies the complexity.

### 4.2 Separation: platform user vs admin operator

- **Platform users** (`User` documents) are customers/creators.
- **Admin operators** should be **the same `User` type** with `staffRole` or a new boolean `isStaff`/`staffStatus` **plus** role assignments — avoids two identity stores. **Alternatively** (larger orgs): separate `StaffAccount` collection; choose based on scale. This spec assumes **one `User` with staff flags + RBAC assignments** for faster delivery.

### 4.3 Migration from `staffRole` enum

1. **Phase A:** Keep `staffRole` for backward compatibility; map `editor` → role `CMS Editor`, `admin` → role `Staff Admin (legacy)`.
2. **Phase B:** Introduce collections per **§13.1** (minimal v1: roles with embedded `permissions: string[]` + `admin_user_roles` join). **Defer** `admin_user_permission_overrides` until after v1 (see §12.1). Optional separate `admin_permissions` catalog table only if you need metadata per key; not required for v1.
3. **Phase C:** Middleware `requirePermission("user:list")` (string key — see **§12.3**) replaces broad `requireStaff` for new routes; legacy routes still use `requireStaff` until migrated.

### 4.4 Example permission catalog (starter)

**User management**

- `user:list`, `user:read`, `user:search`
- `user:update_profile` (subset of fields)
- `user:lock`, `user:unlock`
- `user:delete` (soft), `user:purge` (hard — super restricted)
- `user:reset_email` (initiates verified flow)
- `user:read_oauth` (masked IDs only)
- `user:read_security` (2FA status, last login — not secrets)
- `user:revoke_sessions` (revoke all sessions — **§13.11**)

**Billing**

- `billing:read_subscription`, `billing:read_ledger`
- `billing:open_stripe_customer` (server returns Dashboard deep link)
- `billing:sync_subscription` (trigger reconcile job)

**Content**

- `blog:read_metrics` (counts + list)
- `help:*` (already partially covered by CMS)

**Administration**

- `admin_role:manage`, `admin_assignment:manage`
- `audit:read`

Store permissions as **stable string keys** in DB; optionally group by **resource** in UI.

### 4.5 Types and “permission types”

The product asked for **types** for specific user permissions. Recommended interpretation:

- **Resource type** — the entity family (`user`, `billing`, …).
- **Effect type** — `allow` / `deny` on overrides.
- **Scope type** (optional JSON schema) — e.g. `{ "maxRefundCents": 50000 }` or `{ "helpSections": ["publish"] }`.

Avoid overloading “type” in UI; label clearly as **Scope** or **Constraint**.

---

## 5. Admin UI structure

### 5.1 Navigation

Add primary items (permission-gated):

- **Users** — directory + search.
- **Access control** — roles, resources, permissions, assignments (split tabs).
- Existing: Help, Trash, Subscriptions, Transactions, Documentation — align **Subscriptions/Transactions** with user detail (either embed or cross-link).

### 5.2 Users list (common table component)

**Columns (configurable):** avatar, `fullName`, `username`, `email`, `isActive`, “online” dot, `subscriptionPlanKey`, `subscriptionStatus`, `subscriptionPeriodEnd`, `lastLoginAt`, `staffRole` / roles, blog count (published), createdAt.

**Features:** server-side pagination (**§13.8** — cursor or `_id`-based preferred over naive skip/limit at scale), sort, filter (active, plan, verified, staff), saved views (optional), export CSV (permission-gated, redacted). Optional UX: **account age**, **last admin action**, **high-value** badge — **§13.12**.

**Component requirements (`CommonDataTable` or similar):**

- Stable row keys, loading skeleton, error banner, empty state.
- Accessible column headers, keyboard navigation.
- Row actions dropdown **filtered by** effective permissions for the current admin.

### 5.3 User detail — tabbed layout

1. **Overview** — identity, status badges (active, verified, 2FA), referral summary, counts (followers/following), quick links (public profile URL).
2. **Profile** — read-only or inline edit per permission; show `profileVersion` conflict handling.
3. **Security** — `emailVerified`, `lastLoginAt`, 2FA status, **masked OAuth map**, session list, actions: lock/unlock, reset email (workflow), revoke sessions (if implemented).
4. **Billing** — subscription card (from `Subscription` + user denorm), renewal date, cancel-at-period-end, trial; **transactions** sub-table (`PaymentLedger`); link to Stripe Customer; **payment method** via Stripe (last4, brand) fetched server-side with `billing:read` — never store card data in Mongo.
5. **Content** — blog counts + recent posts list; optional comments metric if product needs moderation.
6. **Permissions (user)** — in **v1**: show **effective permission** summary (computed from roles only). **Defer** direct per-user overrides UI to post-v1 (see §12.1).
7. **Audit** — filterable timeline for this user (`AuditLog` + `BillingAuditLog` if applicable).

### 5.4 Access control area (admin-only)

- **Roles** — CRUD role, attach permissions from catalog.
- **Resources / permissions** — read-only catalog view + versioned import for new keys (or migration scripts).
- **Assignments** — pick staff user, assign roles, optional scope JSON with validation.
- **Search staff** — find operators by email/username.

### 5.5 User search tab / panel

Dedicated search with:

- Query: email (exact/prefix), username, `ObjectId`, `stripeCustomerId`, full name token search.
- **Ranking (tie-break / relevance):** email **exact** → username **exact** → partial matches → full name — **§13.10**.
- Facets: plan, status, active, staff, online-only (expensive — optional).

---

## 6. Locking, deletion, email reset

### 6.1 Lock vs `isActive`

**Recommendation:**

- Use **`isActive: false`** as **login lock** if that is already enforced on auth paths; document the semantics clearly in admin UI (“Login disabled”).
- If product needs **profile visible but login blocked**, introduce `loginDisabled` or reuse `isActive` consistently — **one source of truth**; avoid duplicate flags without documented precedence.

All changes → `AuditLog` with `auth.account.locked` / unlock analogs.

### 6.2 Deletion

- Prefer **soft delete** for user-generated content alignment with `BlogPost.deletedAt` patterns. **User** soft delete shape and query rules — **§13.5** (today’s `User` model may need `deletedAt` / `deletedById` added).
- If user document removal is required, define **cascade policy** (posts, comments, billing) and **GDPR** retention; implement as async job.

### 6.3 Email reset

- Admin **initiates** change → sends verified flow to **new** email or triggers user OTP flow — **do not** set `email` directly without verification unless break-glass policy exists.
- Log `auth.email.change` / admin variant.

---

## 7. Backend API outline (internal / admin)

Prefix suggestion: `/api/internal/admin/...` or `/api/admin/...` behind **staff auth + permission middleware**.

| Endpoint                              | Permission                  | Notes                                            |
| ------------------------------------- | --------------------------- | ------------------------------------------------ |
| `GET /users`                          | `user:list`                 | Pagination, filters                              |
| `GET /users/search`                   | `user:search`               | Dedicated search                                 |
| `GET /users/:id`                      | `user:read`                 | Include joins as sub-documents                   |
| `PATCH /users/:id`                    | `user:update_profile`       | Whitelisted fields                               |
| `POST /users/:id/lock`                | `user:lock`                 |                                                  |
| `POST /users/:id/unlock`              | `user:unlock`               |                                                  |
| `POST /users/:id/email-reset`         | `user:reset_email`          | Starts flow                                      |
| `GET /users/:id/billing`              | `billing:read_subscription` | Subscription + Stripe snippets                   |
| `GET /users/:id/ledger`               | `billing:read_ledger`       | Paginated                                        |
| `GET /users/:id/blog-metrics`         | `blog:read_metrics`         | Counts + optional list                           |
| `GET /users/:id/sessions`             | `user:read_security`        | Devices                                          |
| `POST /users/:id/revoke-all-sessions` | `user:revoke_sessions`      | Revoke all sessions for target user — **§13.11** |
| `GET /admin/roles`                    | `admin_role:manage`         |                                                  |
| `POST /admin/roles`                   | `admin_role:manage`         |                                                  |
| `PUT /admin/roles/:id/permissions`    | `admin_role:manage`         |                                                  |
| `POST /admin/assignments`             | `admin_assignment:manage`   |                                                  |

**Implementation notes:**

- **Permission resolution:** follow **§13.2** — resolve once per request and/or Redis cache with explicit invalidation (not “optional” at scale).
- **Rate limit** destructive actions per admin — concrete defaults in **§12.5** (`rateLimitAuth`-style middleware per route class).
- **Idempotency-Key** for state-changing POSTs — behavior defined in **§14.2** (store key + replay cached response).
- **Multi-write operations** — use **§14.1** transactions (replica set) for role assign, lock/unlock + audit, revoke-all-sessions + audit.
- **Errors** — **§14.4** JSON shape for admin routes.

---

## 8. Audit and compliance

Extend audit actions with namespaces such as:

- `admin.user.lock`, `admin.user.unlock`, `admin.user.profile_update`, `admin.user.email_reset_requested`
- `admin.role.assign`, `admin.permission.override` (if overrides exist later)

**Standardized payload (minimum):** align new admin audit rows with a consistent shape for compliance and queries:

| Field       | Notes                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------- |
| `actorId`   | Staff user performing the action                                                             |
| `targetId`  | Subject user (or resource id)                                                                |
| `action`    | Stable string, e.g. `admin.user.lock`                                                        |
| `resource`  | e.g. `user`, `role`, `billing`                                                               |
| `before`    | Redacted snapshot (optional)                                                                 |
| `after`     | Redacted snapshot (optional)                                                                 |
| `reason`    | **Required** for sensitive actions when policy demands it (locks, email flows, role changes) |
| `metadata`  | `ip`, `userAgent`, correlation ids                                                           |
| `createdAt` | Server time                                                                                  |

Also store legacy-compatible fields where your existing `AuditLog` schema uses `actorUserId` / `targetUserId` — map names in application layer or migrate schema once.

**Retention / scale:** hot-path audit growth — **§14.3** (TTL vs archive vs partition; compliance-sensitive actions may need longer retention).

---

## 9. Security checklist (production)

- [ ] No OAuth tokens in API responses or logs.
- [ ] No `staffPasswordHash` or `twoFactorSecret` in any list/detail DTO.
- [ ] All admin routes require **staff JWT** + **permission** checks (defense in depth).
- [ ] **Principle of least privilege** on default roles.
- [ ] **Break-glass** super-admin role **monitored** + MFA for staff (future).
- [ ] **Row-level** access: if multi-tenant later, enforce tenant on queries.
- [ ] **CSRF** if admin uses cookie sessions; if Bearer-only, document CORS policy.
- [ ] **PII export** gated and logged.
- [ ] **§13** satisfied: RBAC storage, cache invalidation, PATCH allowlists + `profileVersion`, user soft-delete queries, role **levels**, self-protection, cursor pagination, **mandatory** permission-denied logs.
- [ ] **§14** satisfied: **multi-document ops** in transactions where needed; **idempotency** for lock/unlock, email-reset trigger, revoke-sessions; **audit retention** policy; **standard error body**; **kill switches** for admin/RBAC.

---

## 10. Phased delivery plan

| Phase | Deliverable                                                                                   |
| ----- | --------------------------------------------------------------------------------------------- |
| **1** | User directory + detail read-only + blog metrics + sessions + online heuristic + common table |
| **2** | Lock/unlock, profile edit (subset), audit                                                     |
| **3** | Billing tab wired to Subscription + Ledger + Stripe payment method read                       |
| **4** | RBAC schema + middleware + role/assignment UI + migration from `staffRole`                    |
| **5** | Email reset workflow + advanced search + exports                                              |

For a **finishable v1** cut (users + lock + read-only billing + blog metrics + basic RBAC only), align scope with **§12.16** — defer overrides, broad scopes, and impersonation until after that milestone.

---

## 11. Open decisions (record in ADR)

1. Single `User` for staff vs separate `Staff` collection.
2. Whether **impersonation** is ever allowed (high risk).
3. Exact meaning of `isActive` vs dedicated lock flag.
4. Whether **online** is session-based only or also **last API hit** from Redis.

---

## 12. Review: tightening, simplification, and high-impact additions

The base spec (§1–§11) is **already well thought-out and close to production-grade** — the fundamentals are in place. What follows tightens scope, reduces future pain, and adds a few **high-impact** items: **real improvements**, not endless tweaks.

### 🔴 12.1 Biggest problem: over-engineering risk

The RBAC model in §4 is **very flexible**, but risks becoming:

> Too generic → too complex → never finished.

**Issue:** roles + permissions + **overrides** + **scopes** = enterprise-grade surface area before the product needs it.

**Practical fix (v1 “80% system”):**

- **Implement:** roles → permissions **only**.
- **Do not implement yet:** user-level **overrides**.
- **Scopes:** keep **only** for billing (or defer entirely); add broader scopes when a concrete need appears.

Re-introduce overrides **only** after a documented support or compliance use case.

### 🟡 12.2 Permission evaluation logic (critical gap)

Define **how** effective permissions are computed:

```text
Effective permissions = UNION(all permissions from all assigned roles)
```

If **deny overrides** are added later:

```text
Effective = UNION(role permissions) − DENY(overrides)   // only when overrides exist
```

**Rules:**

- **Multiple roles:** union permissions; duplicates are idempotent — **no duplicate permission keys** in the resolved set.
- **Conflicts:** with overrides deferred, there is no allow/deny conflict in v1.
- **Performance:** resolve once per request (or cache in Redis with invalidation on role assignment change).

### 🔴 12.3 Permission middleware design

The spec mentions `requirePermission('user', 'list')`; **standardize on a single string key**:

```ts
requirePermission('user:list');
```

**Internal behavior (conceptual):**

```ts
const perms = await getUserPermissions(userId); // staff operator
if (!perms.has('user:list')) {
  logPermissionDenied(/* §13.9 */);
  throw forbidden();
}
```

Also define:

- **Fallback:** routes not yet migrated continue to use **`requireStaff`** until explicitly switched.
- **Denied access:** for **admin** routes, logging is **mandatory** (not optional) — see **§13.9**.

### 🟡 12.4 Data leakage risk — strict DTO layer

Never return raw Mongoose documents to the admin client.

**Instead of** `return user`, **always** map to an **admin DTO** with an explicit allowlist:

```ts
return {
  id,
  fullName,
  email,
  isActive,
  subscriptionStatus,
  // … only fields approved for this endpoint
};
```

👉 **Never** expose raw DB models or `select: true` secrets by accident.

### 🔴 12.5 Rate limiting strategy for admin

Define limits **per staff user** (or per IP + staff id) for destructive / sensitive actions. Example starting points (tune in deployment):

| Action          | Suggested limit |
| --------------- | --------------- |
| Lock / unlock   | 10 / min        |
| Email reset     | 5 / min         |
| Role assignment | 20 / min        |

👉 Reduces internal abuse, runaway scripts, and mistaken bulk operations.

### 🟡 12.6 Online status logic — clarification

**Session-only `lastActiveAt`** is a heuristic, not perfect presence (mobile, background tabs).

**Recommendation:**

- Treat **online** when `lastActiveAt > now − 2 minutes` (parameterize; earlier spec used 5 minutes — **pick one window** and document it).
- **Improve accuracy over time:** update **`lastActiveAt`** from **authenticated API middleware** on activity (not only when the Session document is touched for refresh), if product needs fresher presence at scale.

**Scalability:** avoid per-request heavy joins; index `Session` by `userId` + `lastActiveAt` for “recent activity” queries.

### 🔴 12.7 Indexing strategy (search and lists)

User list and search need predictable query plans.

**Compound / single-field indexes (verify against actual filters):**

- `email` — unique (existing)
- `username` — indexed (existing)
- `stripeCustomerId` — sparse unique (existing)
- Add as needed: **`staffRole`**, **`isActive`**, **`subscriptionStatus`** (denormalized on user) for admin filters

**Full-text or prefix search:**

- Consider a **text index** on `fullName`, `email`, `username` **or** dedicated search (Atlas Search, etc.) if regex scans become hot.

### 🔴 12.8 Billing section — guardrails

Allowing admins to “override subscription” in Mongo **breaks Stripe sync**.

**Rules:**

- **Never** raw DB edits to subscription fields for normal admin workflows.
- **Only** allow **service-layer** actions such as: `triggerStripeSync()`, `cancelAtPeriodEnd` (via Stripe), `grantTrial()` (blessed path), etc.

### 🔴 12.9 Error handling and admin UX safety

- **Confirmation modals** for destructive actions: lock user, delete user, role changes.
- **Undo** — optional but high leverage for mistaken locks (time-bound revert).
- **Action logs** visible in UI immediately after mutation (optimistic toast + audit id).

### 🟡 12.10 Audit logs — structure standardization

Beyond §8, keep a **strict minimum** for admin rows:

```ts
{
  (actorId,
    targetId,
    action,
    resource,
    before, // redacted
    after, // redacted
    reason, // important for compliance / support
    createdAt);
}
```

### 🟢 12.11 UI improvements (high impact, low effort)

- **Quick actions** on user table rows: lock/unlock, view billing (permission-gated).
- **Sticky filters** / saved views for repeat support workflows.
- **Risk flags** (future): many failed logins, suspicious session patterns — surface as badges when data exists.

### 🔴 12.12 Admin isolation (same `User` table)

**Risk:** accidental privilege escalation if staff and customers share one model without clear flags.

**Minimal hardening:**

- Explicit **`isStaff: boolean`** and **`staffStatus`: `active` \| `suspended`** (or equivalent) — even if `staffRole` remains for legacy.
- Keep **separate staff login** route: `POST /auth/staff-login` (already in use for staff accounts).
- Plan **MFA for staff** as a later requirement for production admin.

### 🟡 12.13 Versioning strategy for RBAC

When permission **names** change, old tokens and audit rows still reference old strings.

**Fix:**

- Version the permission catalog (e.g. `version: 1` on catalog rows or a global `rbac_catalog_version`).
- Ship **migration scripts** when renaming or splitting permissions; avoid silent renames in production.

### 🟢 12.14 What the base spec already does well (keep)

- Separation of **billing / content / user** concerns.
- **Audit-first** mindset.
- **Stripe as source of truth** for money and payment methods.
- **Session-based** device inventory.
- **Phased rollout** (§10).

### ⚡ 12.15 Final reality check

Constraints beat features: **you need simplification and clear rules**, not an ever-growing RBAC wishlist, to ship a **stable v1**.

### 🚀 12.16 Phase lock — v1 “finishable” scope

**Do only this for RBAC + user management v1:**

1. User list + detail
2. Lock / unlock
3. Billing **read-only** (+ Stripe-backed actions only, no raw DB subscription edits)
4. Blog metrics
5. **Basic RBAC:** roles → permissions **only**

**Explicitly skip for v1:**

- User-level permission **overrides**
- General **scopes** (except optional billing-only if required)
- **Impersonation**
- Advanced audit filters

After v1 ships, add items from backlog **only** with evidence.

---

## 13. Pre-build blockers: storage, cache, safety, and list semantics

The spec through §12 is **execution-ready** (scoped RBAC, middleware, DTOs, limits, billing guardrails). The items below are **not optional polish** — define and implement them **before** shipping admin user management, or you risk inconsistent resolution, data leaks, and privilege escalation.

### What already landed well (keep)

- Locked RBAC scope (**roles → permissions only**).
- Permission evaluation (**UNION** of role permissions).
- Middleware shape: `requirePermission("user:list")`.
- DTO allowlists (no raw Mongoose to client).
- Rate limits, indexing, billing guardrails, **§12.16** v1 scope.

### 13.1 Permission storage structure (minimal v1)

Conceptual RBAC is not enough — **persist** it unambiguously. Prefer **few tables** over normalization for v1.

**Recommended minimal shape:**

```ts
// AdminRole (or `admin_roles` collection)
{
  _id: ObjectId,
  name: string,
  level: number,              // §13.6 — role rank for assignment safety
  permissions: string[],      // e.g. ["user:list", "user:read", "billing:read_ledger"]
  // optional: description, createdAt
}

// AdminUserRole — join staff operator → role
{
  userId: ObjectId,   // staff user (must be staff — enforce in service layer)
  roleId: ObjectId,
  // optional: unique index on (userId, roleId)
}
```

- **Do not** add extra junction tables for “permission entities” unless you need metadata per permission key.
- Keep permission strings **stable** and version the catalog if keys change (**§12.13**).

### 13.2 Permission resolution and caching (enforce a strategy)

**Problem:** Resolving roles → permissions on **every** DB round-trip without a plan will slow the admin API under load.

**Rules:**

1. Resolve effective permissions **at most once per request** in middleware/context (attach `req.adminPermissions: Set<string>`).
2. **Optional but recommended at scale:** Redis cache:

   ```text
   cacheKey = admin_perms:${staffUserId}
   ```

3. **Invalidate** cache when:
   - a role’s `permissions` array changes, or
   - a user’s role assignment (`AdminUserRole`) is added/removed.

Without invalidation rules, stale permissions are a **security bug**.

### 13.3 Field-level control for `user:update_profile`

**Problem:** `user:update_profile` without a **server-side allowlist** lets bugs or malicious clients send `email`, OAuth IDs, or tokens.

**Fix:** For each admin PATCH handler, define **explicit allowed keys** (example — tune to product):

```ts
const ADMIN_PROFILE_ALLOWED = [
  'fullName',
  'bio',
  'job',
  // … never email, oauth ids, tokens, staff fields, billing fields unless separate permission + handler
];
```

- Reject unknown keys (**400**).
- Stricter permissions can map to **different** allowlists (e.g. `user:update_email` only after verified flow — not a raw PATCH field).

### 13.4 Concurrency: `profileVersion` on admin PATCH

**Problem:** Two admins editing the same profile can overwrite each other.

**Fix:** Admin `PATCH` must accept **`expectedProfileVersion`** (or equivalent). Server:

```ts
if (incomingExpectedVersion !== doc.profileVersion) {
  throw conflictError(); // 409 — client refreshes and retries
}
```

Align with existing product profile concurrency patterns (`PROFILE_VERSION_CONFLICT`).

### 13.5 User soft delete (structure + queries)

**Problem:** “Prefer soft delete” without schema leads to leaked “deleted” users in lists.

**Fix:** Add to **User** (if not present):

- `deletedAt?: Date | null`
- `deletedById?: ObjectId` (admin who performed delete)

**Every** admin list/search query must include **`{ deletedAt: null }`** (or equivalent) unless the screen is explicitly “deleted users”.

### 13.6 Role safety: levels and no upward assignment

**Problem:** Any admin assigning **any** role enables privilege escalation.

**Fix:**

- Add **`level`** (integer) on `AdminRole` — higher = more powerful (define ordering in one place).
- When **actor** assigns **targetRole** to another user:

  ```ts
  if (targetRole.level > actorMaxRoleLevel) {
    throw forbidden(); // 403
  }
  ```

- `actorMaxRoleLevel` = max level among roles assigned to the **acting** staff user (or a dedicated `staffLevel` if you simplify).

Document break-glass super-admin separately (MFA, audit).

### 13.7 Self-protection rules

**Problem:** Staff can lock themselves out or strip their own access by mistake (or social engineering).

**Block or require extra confirmation** for (non-exhaustive):

- `targetUserId === actorUserId` for: lock, unlock, role change, permission-affecting actions, destructive deletes.
- Optionally: allow only **higher-level** admin to modify an equal-level peer.

### 13.8 Pagination strategy (lists at scale)

**Problem:** `skip`/`limit` degrades as `skip` grows (large offsets scan many documents).

**Fix (pick one and document):**

- **Cursor-based:** `?cursor=<opaque>&limit=50` where cursor encodes sort key + `_id`, **or**
- **Keyset / `_id` pagination:** sort by `_id` or `(createdAt, _id)` and pass last seen values.

Use offset pagination only for small internal tools with known low volume.

### 13.9 Mandatory logging for permission failures (admin)

**Problem:** “Optional” deny logs make production 403s impossible to debug.

**Fix:** For **all** admin routes behind `requirePermission`, on **403** log a structured event (no PII in message body):

```ts
{
  (actorId,
    route, // e.g. GET /api/admin/users
    requiredPermission, // e.g. "user:list"
    timestamp);
}
```

Optional: same for **authenticated** staff who fail the check (distinct from unauthenticated 401).

### 13.10 Search ranking

When multiple fields match, define **priority** so support sees the right row first:

1. **Email** exact match (case-normalized).
2. **Username** exact match.
3. Partial / prefix matches on email or username.
4. **Full name** token / text match.

Implement as ordered queries, compound score, or search engine ranking — but **document** the order in code comments.

### 13.11 Revoke all sessions

Listing sessions is not enough for account recovery.

- **Endpoint:** `POST /users/:id/revoke-all-sessions` (permission e.g. `user:revoke_sessions`).
- **Behavior:** mark all non-revoked sessions for that user as **revoked** (or delete rows per your session model), log audit, rate-limit (**§12.5**).

### 13.12 Small UX additions (optional v1 if time)

- **Last action by admin** on user (from audit tail or denormalized pointer).
- **Account age** badge (`createdAt`).
- **High-value user** tag from billing (e.g. active paid plan, LTV threshold) — read-only signal.

### 13.13 Implementation freeze — build this v1 (no redesign loop)

Do **not** expand the spec further before shipping the following:

| Area    | Deliverable                                                                       |
| ------- | --------------------------------------------------------------------------------- |
| Users   | List + detail                                                                     |
| Account | Lock / unlock                                                                     |
| Billing | Read-only (+ Stripe-aligned actions only)                                         |
| Content | Blog metrics                                                                      |
| Access  | RBAC roles → permissions only (**§13.1**, **§13.2**)                              |
| Ops     | **§14** transactions, idempotency, audit retention, error contract, kill switches |

Defer until post-v1: overrides, broad scopes, impersonation, advanced audit UI — **§12.16**.

---

## 14. Final delivery constraints (last ~5% — then ship)

Specs **§12–§13** are **execution-grade**: RBAC shape, cache, allowlists, concurrency, soft delete, hierarchy, pagination, deny logs, search ranking, revoke sessions. What follows closes **operational** gaps: **atomicity**, **idempotency**, **audit scale**, **errors**, **flags**, and **runbook-style** extras.

### 14.0 Status (what’s already solid)

| Area                           | Covered in |
| ------------------------------ | ---------- |
| Roles → permissions only       | §12, §13   |
| DB + cache invalidation        | §13.1–13.2 |
| Field allowlists               | §13.3      |
| `profileVersion`               | §13.4      |
| Soft delete                    | §13.5      |
| Role `level` + self-protection | §13.6–13.7 |
| Cursor pagination              | §13.8      |
| Permission-denied logs         | §13.9      |
| Search ranking                 | §13.10     |
| Revoke all sessions            | §13.11     |

**Verdict:** v4 of this document = **production-oriented** — remaining items below are **tightening**, not redesign.

### 14.1 Transaction safety (MongoDB multi-document consistency)

**Problem:** Operations that touch **multiple documents** (role assignment + audit row; lock user + audit; session revoke + audit) can **partially fail** and leave inconsistent state.

**Fix:** Use **`mongoose.startSession()`** + **`session.withTransaction()`** for critical paths:

```ts
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  // e.g. insert AdminUserRole + append AuditLog + invalidate RBAC cache key
});
```

**Especially:**

- Role assignment / removal
- Lock / unlock
- Email-reset **trigger** (if it writes multiple rows)
- Revoke-all-sessions (many `Session` updates + audit)

**Note:** MongoDB transactions require a **replica set** (or Atlas). In dev/single-node, document fallback behavior (e.g. sequential writes + compensating job) or require replica set for staging/prod.

### 14.2 Idempotency enforcement (`Idempotency-Key`)

**Problem:** Retries (mobile, proxies, double-clicks) can **duplicate** side effects.

**Spec:** Clients MAY send **`Idempotency-Key: <opaque uuid>`** on state-changing **POST**s. Server:

1. **Normalize** key with **actor user id** + **route template** (e.g. `POST /users/:id/lock`) so one key cannot collide across users/routes.
2. **Store** (TTL 24–72h): `key`, `actorUserId`, `endpoint`, `statusCode`, `responseBody` snapshot (or hash + stored JSON).
3. **If duplicate:** return **same** HTTP status + body as first completion (**replay**).
4. **Scope (v1 minimum):** lock/unlock, email-reset initiate, revoke-all-sessions.

**In-flight:** optional second request with same key returns **409** or waits — pick one and document.

### 14.3 Audit log growth (retention and archive)

**Problem:** High-volume admin + user audit rows **grow without bound** and slow queries.

**Fix — choose a policy and automate:**

- **TTL index** on `createdAt` for **non-compliance** categories only (if legal allows), **or**
- **Archive:** e.g. move rows **older than 90 days** to cold storage (S3 Parquet, separate collection, or analytics warehouse) and **delete** from hot DB, **or**
- **Partition** by month + drop old partitions.

**Compliance:** some events may need **longer retention** — use **action-type–based** retention, not one TTL for all.

### 14.4 API error standardization (admin JSON contract)

**Problem:** Ad hoc `{ message }` responses hurt the admin UI and client debugging.

**Fix:** Use a **consistent** error envelope for admin APIs (align with existing app patterns if any):

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have access to this resource"
  }
}
```

**Recommended codes (examples):** `PERMISSION_DENIED`, `VALIDATION_ERROR`, `CONFLICT` (409 + `profileVersion`), `NOT_FOUND`, `RATE_LIMITED`, `IDEMPOTENCY_REPLAY`.

👉 Frontend maps `code` to toasts; logs use `code` + correlation id.

### 14.5 Feature flags / kill switches

**Problem:** A bad deploy can leave admin **broken** or **unsafe** with no fast mitigation.

**Fix:** Environment or remote flags, e.g.:

- `FEATURE_ADMIN_RBAC_ENABLED` — if `false`, fall back to **`requireStaff`** only for emergency (document risk).
- Optional: `FEATURE_ADMIN_USER_WRITE_ENABLED` — disable lock/unlock PATCH without taking API down.

Flags are **operational** — document in runbook; avoid long-term “RBAC off” in production.

### 14.6 Minor additions (optional, high UX)

- **Bulk actions:** lock/export **multiple** users — **async job** + audit per row or single bulk audit with attachment list (**§14.7**).
- **Export filtered users** — permission-gated, rate-limited, streaming CSV.

### 14.7 Background jobs (define explicitly)

Move **heavy or flaky** work off the request thread:

| Work                               | Pattern                          |
| ---------------------------------- | -------------------------------- |
| Stripe sync / reconcile            | Queue or existing billing worker |
| Email reset delivery               | Queue + idempotent enqueue       |
| Audit enrichment (geo, UA parsing) | Async                            |

API returns **202** + job id when appropriate.

### 14.8 Monitoring hooks

Beyond **§13.9** permission denials:

- **High-frequency** admin actions per actor (possible abuse) — metric + alert threshold.
- **Spike** in `PERMISSION_DENIED` for one actor — investigate misconfigured role or attack.

### 14.9 Stop improving the spec — execution order

**Do next (only):**

1. Build **backend** (RBAC + user admin APIs per §7, §13–§14).
2. Build **admin UI** (users + roles assignments).
3. Test on **real** or staging data.
4. Fix **only** production issues — no RBAC redesign.

**Do not (until post-v1):** scopes, overrides, impersonation, or another full RBAC rewrite — **§12.16**.

---

_Document version: 1.3 — adds §14 (transactions, idempotency, audit retention, error contract, feature flags, jobs/monitoring, ship gate). Update when schema or auth flows change._
