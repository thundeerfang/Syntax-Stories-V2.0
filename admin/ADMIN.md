# Syntax Stories — Admin Dashboard (Complete Reference)

This document describes the **`admin/`** Next.js application, how it connects to the **`server/`** API, security boundaries (JWT, staff RBAC, protected routes), seed credentials, OAuth in the wider platform, and a **feature roadmap** for payments, user administration, blogs, analytics, and RBAC management.

For CMS help-article API contracts and editorial workflow, see also:

- [`docs/PLATFORM_DOCUMENTATION_AND_ADMIN_CMS_BLUEPRINT.md`](../docs/PLATFORM_DOCUMENTATION_AND_ADMIN_CMS_BLUEPRINT.md)
- [`docs/Auth.md`](../docs/Auth.md) — OAuth flows, `/auth/*` JSON API, session model

---

## 1. Purpose and scope

| Layer | Responsibility |
|--------|------------------|
| **`admin/`** | Staff-only console: help/CMS editing, **soft delete center** (restore help / blog / users), internal documentation links, **placeholder** billing views (subscriptions, transactions). |
| **`server/`** | Enforces **all** business rules: JWT verification, MongoDB `staffRole`, help article CRUD/publish, Stripe webhooks (billing data lives here). |
| **`webapp/`** | End-user app; OAuth and email OTP for **customers**, not the staff password flow used on the admin login page. |

The admin UI must **not** duplicate authorization logic: every sensitive action is rejected unless the API accepts the caller’s JWT and staff role.

---

## 2. Tech stack (admin app)

- **Framework:** Next.js (App Router), React 19.
- **UI:** MUI (Material UI), custom theme provider.
- **State:** Zustand with `persist` for access/refresh tokens (localStorage key `syntax-stories-admin-session`).
- **API calls:** `fetch` to `NEXT_PUBLIC_API_BASE_URL` (see §4).

**Important:** Tokens are stored in **localStorage** today. For production hardening, prefer **httpOnly cookies** or a BFF pattern so XSS cannot exfiltrate Bearer tokens as easily. This is a known tradeoff documented in the platform blueprint.

---

## 3. Environment configuration

Copy `admin/.env.example` to `.env.local` (or use `.env` locally).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** (production) | Backend **origin only** — no `/api` suffix, e.g. `https://api.example.com` or `http://localhost:7373`. If unset in development, the client defaults to `http://localhost:7373`. |

**CORS:** The browser sends `Origin` for admin requests. In **production**, the server allows only origins derived from `FRONTEND_URL` (see `server/src/config/frontendUrl.ts`). Add your admin site URL to the comma-separated `FRONTEND_URL` list (e.g. `https://app.example.com,https://admin.example.com`). Development reflects any origin for DX.

---

## 4. Authentication flows

### 4.1 Staff login (what the admin UI uses today)

The login page posts to:

```http
POST /auth/staff-login
Content-Type: application/json

{ "email": "<staff email>", "password": "<staff password>" }
```

**Server behavior** (`server/src/modules/auth/controllers/staffLogin.controller.ts`):

- Loads the user with `staffPasswordHash` selected.
- Requires `staffRole` **`editor`** or **`admin`**.
- Verifies bcrypt password against `staffPasswordHash`.
- Issues the same JWT/session pattern as other email-based auth (`loginSource: 'staff_password'`), including **skipping 2FA** for this path (by design for break-glass staff accounts).

**Rate limiting:** `POST /auth/staff-login` is rate-limited per IP (`server/src/middlewares/auth/rateLimitAuth.ts`) to reduce brute-force attempts.

### 4.2 OAuth (Google, GitHub, etc.)

**End users** authenticate via Passport OAuth routes on the server (`/auth/{provider}/...`) and the **`webapp`** callback flow. The **admin** login screen does **not** currently offer OAuth buttons; staff access is **password + staffRole** on the account.

**Implication:** “We use OAuth” applies to **product users** and linked identities on the `User` document (`isGoogleAccount`, `gitId`, etc.). Staff can still be the same Mongo user if you grant `staffRole` and `staffPasswordHash` to an account that also linked Google — `GET /auth/me` then returns both OAuth flags and `staffRole`.

### 4.3 Session validation (JWT + server-side session)

After login, the admin stores `accessToken` and optional `refreshToken`. On each gated screen:

1. **`RequireAuth`** (`admin/src/components/dashboard/RequireAuth.tsx`) ensures a token exists, then calls **`GET /auth/me`** with `Authorization: Bearer <accessToken>`.
2. The server’s **`verifyToken`** middleware (`server/src/middlewares/auth/verifyToken.ts`) verifies the JWT with the configured public key and, when the token carries `sessionId`, confirms the session row is **not revoked** and **not expired**.

Invalid or expired tokens clear the client session and redirect to `/login`.

### 4.4 Profile data returned to the admin client

`GET /auth/me` maps the user through `mapUserDocumentToApiUser` (`server/src/modules/profile/profile.mapper.ts`). Relevant fields for admin context:

- Identity: `_id`, `fullName`, `username`, `email`
- Profile: `profileImg`, bio, social links, work/education blocks, etc.
- Security: `twoFactorEnabled`, OAuth flags (`isGoogleAccount`, …)
- **RBAC:** `staffRole` — `null` | `"editor"` | `"admin"`

The admin gate treats only **`editor`** and **`admin`** as allowed.

---

## 5. Protected routes (frontend)

| Mechanism | Location | Behavior |
|-----------|----------|----------|
| **Layout guard** | `admin/src/app/(dashboard)/layout.tsx` | Wraps all dashboard pages in **`RequireAuth`** + `DashboardShell`. |
| **Public entry** | `admin/src/app/login/page.tsx` | Unauthenticated; successful staff login redirects to `/`. |
| **Role check** | `RequireAuth.tsx` | After `fetchMe`, if `staffRole` is not `editor` or `admin`, calls `logout()` and sends user to `/login`. |

Any new route under `src/app/(dashboard)/` is automatically protected. Routes **outside** that group (e.g. `/login`) are not.

---

## 6. Locked API (server-side CMS)

All **admin help** routes are mounted under **`/api/v1/admin/help`** (see `server/src/routes/index.ts`).

**Stack for every admin help handler:**

1. **`verifyToken`** — Valid JWT and active session (when applicable).
2. **`requireStaff('editor', 'admin')`** — Loads `staffRole` from Mongo; returns **403** if missing or wrong (`server/src/modules/help/requireStaff.middleware.ts`).
3. **`adminWrite` rate limit** — 200 requests/minute per IP (express-rate-limit).

### 6.1 Route table (implemented)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/admin/help/articles` | Paginated staff list |
| POST | `/api/v1/admin/help/articles` | Create draft |
| GET | `/api/v1/admin/help/articles/:id` | Editor load |
| PATCH | `/api/v1/admin/help/articles/:id` | Save draft |
| POST | `/api/v1/admin/help/articles/:id/publish` | Publish |
| POST | `/api/v1/admin/help/articles/:id/rollback` | **`admin` only** (service enforces) |
| POST | `/api/v1/admin/help/articles/:id/lock` | Acquire edit lock |
| DELETE | `/api/v1/admin/help/articles/:id/lock` | Release lock |

Public read endpoints (separate router): `/api/v1/help/articles`, `/api/v1/help/articles/:slug`.

### 6.2 RBAC inside the help service

| Action | `editor` | `admin` |
|--------|----------|---------|
| Create/edit own or shared articles per `canEditArticle` | Yes (subject to ownership rules in `help.service.ts`) | Yes |
| Rollback published version | No | Yes |
| Break another user’s lock | No | Yes |

See `server/src/modules/help/help.service.ts` for `canEditArticle`, lock behavior, and error codes.

---

## 6.5 Soft delete center (global trash + restore)

This is the **operational** layer on top of CMS rollback: items can leave the active dataset without a hard `remove()`, and staff can **restore** from one place.

### Data model

| Resource | How “deleted” is represented | Restore rules |
|----------|------------------------------|---------------|
| **Help articles** | `deletedAt`, `deletedById`, `slugBeforeDelete`; slug rewritten to `…--deleted--<suffix>` so the unique index stays valid | **Editor** (if you can edit the article) or **admin** — same rule as `canEditArticle` |
| **Blog posts** | Existing `deletedAt` / `deletedById` on `BlogPost` | **Admin only** in admin trash; same **7-day** retention as owner restore in the main app |
| **Users** | `isActive: false` (includes self-service account deactivation) | **Admin only** — sets `isActive: true` again |

### API (server)

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | `/api/v1/admin/trash?sections=help,blog,user&page=&pageSize=` | `editor` \| `admin` | Paginated trash **per section** (`help`, `blog`, `users` in JSON) |
| POST | `/api/v1/admin/trash/restore` body `{ "resourceType": "help"\|"blog"\|"user", "id": "<mongo id>" }` | Help: editor+admin with edit rights; **blog & user: admin only** | Restore one item |
| DELETE | `/api/v1/admin/help/articles/:id` | `editor` \| `admin` (edit permission) | **Soft-delete** one help article (moves to trash, audit `admin.help.soft_deleted`) |

Audit events (see `server/src/shared/audit/events.ts`): `admin.help.soft_deleted`, `admin.help.restored`, `admin.blog.restored`, `admin.user.restored`.

### Admin UI

- **`/trash`** — “Soft delete center” with three tables and **Restore** actions.
- **Help list** (`/help`) — trash icon per row (moves to trash) + link to the soft delete center.

### Design note (avoid over-building)

Rollback inside the CMS is still the tool for **published version** history; soft delete is for **removing an entire article** from circulation and recovering it later. Do not replace rollback with trash — they solve different problems.

---

## 7. Seed data (bootstrap admin user)

**Source of truth:** `server/src/bootstrap/ensureSyntaxAdminSeed.ts`

| Field | Seeded value |
|-------|----------------|
| **Email** | `admin@syntax.com` (constant `SYNTAX_ADMIN_EMAIL`) |
| **Username** | `syntax_admin_root` |
| **Password (plaintext)** | `1234` — stored as **bcrypt** in `staffPasswordHash` when missing |
| **`staffRole`** | `admin` |
| **Subscription** | A `free` / `active` subscription document is created for new users |

**Login:** `POST /auth/staff-login` with email `admin@syntax.com` and password `1234`.

> **Note:** If your team uses **`admin@multiplus`** as a convention, that address is **not** in the current seed file. Either update `SYNTAX_ADMIN_EMAIL` (and rerun bootstrap) or create/update a user in MongoDB with `staffRole: 'admin'` and a `staffPasswordHash` for your chosen password.

---

## 8. Admin UI surface (current)

Navigation is defined in `admin/src/components/dashboard/navConfig.ts`.

| Path | Purpose | Data source |
|------|---------|-------------|
| `/` | Overview cards (links to Help, Documentation, Subscriptions) | Static |
| `/help` | List help articles | `GET /api/v1/admin/help/articles` |
| `/help/new` | Create article | `POST /api/v1/admin/help/articles` |
| `/help/[id]/edit` | Editor | `GET`/`PATCH`/`POST publish` admin routes |
| `/documentation` | Pointer to repo blueprint / future handbook | Static |
| `/subscriptions` | **Placeholder** table | Demo rows only — **no live API** yet |
| `/transactions` | **Placeholder** table | Demo rows only — **no live API** yet |
| `/trash` | **Soft delete center** — help, blog, user restore | `GET/POST /api/v1/admin/trash/*` |

Client API helpers live in `admin/src/lib/api.ts` (help, trash, and related calls).

---

## 9. Security checklist (production)

API RBAC is **necessary but not sufficient**. Combine layers:

| Layer | Recommendation |
|-------|----------------|
| **Network** | Restrict admin hostname (VPN, office IP allowlist, Cloudflare Access, private VPC). |
| **Edge** | Optional HTTP Basic or IdP in front of `admin.*` for defense in depth. |
| **Identity** | Strong staff passwords; rotate `staffPasswordHash`; consider SSO for staff later. |
| **Rate limits** | Already on `staff-login` and admin help writes — extend for any new admin APIs. |
| **Audit** | Server audit logs for auth and billing — surface critical events in a future admin “Audit” view. |
| **Tokens** | Move off localStorage when feasible; short-lived access + refresh rotation already supported by server patterns. |
| **CORS** | Never use `*` with credentials; keep `FRONTEND_URL` explicit. |

---

## 10. Feature and function roadmap (admin panel)

The following maps **desired** capabilities to **current state** and **suggested** server contracts so product and engineering stay aligned.

### 10.1 Payments and billing

| Capability | Status | Direction |
|------------|--------|-----------|
| Stripe webhooks, subscriptions in DB | Implemented on **server** (see billing modules, `Subscription` model) | Expose **read-only** admin list endpoints, e.g. `GET /api/v1/admin/billing/subscriptions` with `verifyToken` + `requireStaff` + optional `isAdminRequest` for PII-heavy fields |
| Transactions / invoices | UI placeholder | `GET /api/v1/admin/billing/transactions` paginated; join Stripe customer id / internal user id |
| Refunds / plan changes | Not in admin UI | Restrict to `staffRole === 'admin'`; write **BillingAuditLog** (`source: 'admin'`) |

### 10.2 Users and profiles (admin view)

| Capability | Status | Direction |
|------------|--------|-----------|
| Search users | Not in admin | `GET /api/v1/admin/users?q=&page=` — redact secrets; staff-only |
| User detail (OAuth providers, 2FA, email) | Not in admin | Single-user GET with field policy by role |
| Impersonation | Not implemented | Avoid until strong audit + legal review; prefer read-only “view as” |

### 10.3 RBAC tab (roles, actions, resources)

| Capability | Status | Direction |
|------------|--------|-----------|
| Mongo `staffRole` (`editor` \| `admin`) | Implemented | Extend only with migration plan — today two roles suffice for CMS |
| Fine-grained permissions (resource × action) | Not implemented | Optional future: `Permission` collection or policy JSON; **must** mirror checks in middleware |
| UI to assign `staffRole` | Not in admin | **`admin`-only** `PATCH /api/v1/admin/users/:id/staff` with audit log |

Suggested **action** vocabulary for future docs: `read`, `create`, `update`, `delete`, `publish`, `rollback`, `billing:read`, `billing:write`, `users:read`.

### 10.4 Blogs (content admin)

| Capability | Status | Direction |
|------------|--------|-----------|
| Public blog API | Exists under server `/api` (see `docs/Auth.md` / blog routes) | Mirror help pattern: ` /api/v1/admin/blog/...` with same JWT + `requireStaff` |
| Draft / publish / views | Varies by model | Add **view counts** via analytics pipeline or field on `BlogPost`; admin dashboard for trending posts |

### 10.5 Analytics (views: blogs, profiles)

| Capability | Status | Direction |
|------------|--------|-----------|
| Profile view counts | Platform may use analytics module | Admin “top profiles” = aggregated query with staff read role |
| Blog views | Same | Tie to existing analytics events if present |
| Dashboard KPIs | Overview uses static cards | Replace with `GET /api/v1/admin/metrics/summary` when ready |

### 10.6 Help and internal documentation

| Capability | Status |
|------------|--------|
| Help CMS | **Implemented** (full stack) |
| Static documentation page | **Stub** — links to monorepo markdown; can embed external docs URL later |

---

## 11. Operational maturity roadmap (prioritized)

High-impact additions that turn this into a **production-grade control plane** without an endless feature matrix. **Build order** matters more than raw feature count.

### Build now (highest leverage)

1. **Admin audit & activity log UI** — expose existing `audit_logs` (and security events) via `GET /api/v1/admin/audit-logs`; include login attempts, help publish/rollback, billing, role changes.
2. **User management** — `GET /api/v1/admin/users`, `PATCH …/staff-role` (**admin-only**), every change audited.
3. **Metrics API** — `GET /api/v1/admin/metrics/summary` (users, active, revenue signal, articles published, API usage) to replace static overview cards.
4. **Billing (read-only first)** — wire subscriptions/transactions placeholders to real Stripe-backed list endpoints.

### Build next

5. **Feature flags** — `GET/PATCH /api/v1/admin/feature-flags/:key` for toggles without deploy.
6. **CMS UX** — version diff, autosave, preview-before-publish (editor-quality, not more schema).

### Defer (intentionally)

- Fine-grained RBAC matrix beyond `editor` / `admin`.
- Impersonation (high risk; needs legal + audit).
- Premature microservice split.

### Security hardening (parallel track)

- Move tokens off **localStorage** toward **httpOnly cookies** or a **BFF**; add stricter login alerting and optional IP/device signals when you add session listing.

### Related “nice next” items

- **Session management** — `GET /api/v1/admin/sessions?userId=`, `DELETE …/sessions/:id` for revoke.
- **System health** — `GET /api/v1/admin/system/health` (DB, latency, error rate).
- **Admin notifications** — failed payments, suspicious logins, surfaced in UI.

---

## 12. Quick reference — files

| Concern | Path |
|---------|------|
| Admin route guard | `admin/src/components/dashboard/RequireAuth.tsx` |
| Staff login UI | `admin/src/app/login/page.tsx` |
| Session store | `admin/src/store/session.ts` |
| API helpers | `admin/src/lib/api.ts` |
| CMS routes | `server/src/modules/help/help.routes.ts` |
| Trash / soft delete API | `server/src/modules/trash/trash.routes.ts`, `trash.service.ts` |
| Soft-delete query helper | `server/src/shared/db/notDeleted.ts` |
| Staff middleware | `server/src/modules/help/requireStaff.middleware.ts` |
| JWT verification | `server/src/middlewares/auth/verifyToken.ts` |
| Staff login API | `server/src/modules/auth/controllers/staffLogin.controller.ts` |
| Seed admin | `server/src/bootstrap/ensureSyntaxAdminSeed.ts` |
| User RBAC fields | `server/src/models/User.ts` (`staffRole`, `staffPasswordHash`) |

---

## 13. Summary

- The **admin dashboard** is a separate Next.js app that authenticates staff via **`POST /auth/staff-login`**, stores JWTs client-side, and protects `(dashboard)/*` with **`RequireAuth`** + **`staffRole`** checks.
- **CMS help APIs** under **`/api/v1/admin/help`** are the reference implementation of **locked APIs**: JWT, session validity, **`editor`/`admin`** role, rate limits, and stricter rules inside **`help.service.ts`** (e.g. rollback **admin-only**).
- **Subscriptions**, **transactions**, **full user directory**, **blog admin**, **RBAC UI**, and **analytics dashboards** are **planned / partially stubbed**; the server remains the source of truth when those endpoints are added.
- **Bootstrap seed** uses **`admin@syntax.com`** / **`1234`** (not `admin@multiplus`) unless you change the seed or create a matching Mongo user.

When you add new admin capabilities, follow the same pattern: **`verifyToken`** → **`requireStaff(...)`** (or admin-only middleware) → domain service → audit logging for mutating actions.
