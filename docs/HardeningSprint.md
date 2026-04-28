# Hardening sprint — Syntax Stories

This document captures a **realistic 3-month hardening roadmap** (velocity-preserving, not a rewrite), the **most likely production failure modes** for the current architecture, and what is **already implemented** in the repo.

Related docs: [Auth](./Auth.md), [Audit Log](./Audit%20Log.md), [Analytics](./Analytics.md), [Followers](./Followers.md).

---

## Philosophy

Stripe-style hardening means:

- **Tighten before scale** — the codebase is structured enough to harden, not to throw away.
- **Incident probability × growth** drives order — auth and shared infrastructure first; flashy rewrites last.
- **Incremental PRs** — each step keeps `tsc` green and behavior identical unless explicitly changing semantics.

---

## Month 1 — Stabilize dangerous edges

| Priority | Item | Rationale |
|----------|------|-----------|
| 1 | Split `modules/auth/auth.controller.ts` by **behavior** (OTP ✅, then session, profile, 2FA, QR, account link) | Auth incidents are the most expensive; one mega-controller becomes collision-prone. |
| 2 | **Route registration** out of `app.ts` | Boot file should not accumulate feature knowledge; reduces silent drift when adding routes. |
| 3 | **Redis key factory** — single module listing every key shape | Prevents invisible namespace collisions as OTP, OAuth, rate limits, and analytics grow. |
| 4 | **Mail pipeline** — SMTP vs Resend as pluggable providers behind one `sendAuthEmail` entry | ✅ Providers split + `MailSendError` kinds; further work: retries, metrics hooks. |

### Already done (baseline for this repo)

- **`server/src/bootstrap/`** — `registerStaticUploads`, `registerApiRoutes`, `registerUploadApiRoutes`, `registerAuthModuleRoutes`, `registerOAuthRoutes`.  
  `app.ts` only wires global middleware (helmet, JSON, CORS, session, Passport) then calls these in the **same order as before**: `/uploads` → `/api` → `/api/upload` → `/auth` (JSON router) → OAuth browser routes.
- **`server/src/shared/redis/keys.ts`** — `redisKeys` documents and centralizes key shapes used by auth (OTP, intent, 2FA setup, QR login, email change, OAuth link nonces), idempotency, auth rate-limit prefixes + **HTTP RL full key** (`rateLimit.authHttpKey`), analytics cache + profile-view RL, and follow daily caps.  
  **Note:** OAuth link keys remain `link:<nonce>` on purpose — renaming would break existing Redis data and in-flight linking. **`connect-redis` session keys** are still owned by the library, not this module.
- **`server/src/modules/auth/controllers/otp.controller.ts`** — ALTCHA challenge, `sendOtp`, `signupEmail`, `verifyOtp`; wired from `auth.routes.ts`. Remaining handlers stay in `auth.controller.ts` for the next vertical extractions.
- **`server/src/modules/auth/securityEventLog.ts`** — shared `logSecurityEvent` for auth modules (was duplicated inside the mega-controller).
- **`server/src/infrastructure/mail/`** — `MailSendError` + `MailErrorKind` (`configuration` | `transient` | `provider`), `provider/smtpProvider.ts`, `provider/resendProvider.ts`, orchestration in `sendAuthEmail.ts` (SMTP first, then Resend fallback). OTP paths map **transient** mail errors to a clearer user message.

---

## Month 2 — Reduce hidden coupling

| Item | Rationale |
|------|-----------|
| **Response contracts** — shared types for auth (and later API) responses | Stops `{ success }` vs `{ token, user }` drift; frontend and OpenAPI can align. |
| **Typed audit taxonomy** — `shared/audit/events.ts` with action constants + payload maps | Keeps analytics and compliance queries predictable. |
| **Upload abstraction** — `storage` interface with `localStorage` implementation | Disk → S3/R2 becomes a swap, not a route rewrite. |

### Shipped in repo (Month 2)

- **`server/src/shared/contracts/authApi.ts`** — canonical auth JSON shapes; **`webapp/src/api/auth.ts`** imports via `@contracts/authApi` (see `webapp/tsconfig.json` paths + `next.config.ts` `experimental.externalDir`).
- **`server/src/shared/audit/events.ts`** — `AuditAction` / `AuditActionName` + profile-diff actions; call sites use constants (OTP, OAuth, follow, analytics, auth profile PATCH).
- **`server/src/services/storage/`** — `UploadStorage` + `getDefaultUploadStorage()` / local disk layout; **`routes/upload.routes.ts`** and **`registerStaticUploads`** use `dirs.*` instead of hardcoding `process.cwd()/uploads`.
- **OpenAPI fragment** — `docs/openapi/auth-contracts.yaml` mirrors the same contracts for docs or codegen.

---

## Month 3 — Incident prevention

| Item | Rationale |
|------|-----------|
| **Error taxonomy** — domain errors + centralized mapper in `errorHandler` | Faster debugging and consistent client handling. |
| **Session domain module** — `session.service` / `token.service` / `revoke.service` | Room for device graph, trust signals, per-device revoke. |
| **Lightweight internal events** — local `emit` for login success, OTP sent, etc. | Decouples audit/metrics from controller bodies (avoid sync side effects on hot paths). |

### Shipped in repo (Month 3)

- **`server/src/errors/httpErrors.ts`** — `AppHttpError`, `ValidationHttpError`, `AuthHttpError`, `RateLimitHttpError`; **`middlewares/errorHandler.ts`** maps them to JSON (`code`, optional `details`, `Retry-After` for rate limits).
- **`server/src/services/session.service.ts`** — session creation, refresh token, `createSessionAndTokens`, exported **`SESSION_DURATION_MS`** for sliding refresh in `refreshToken` handler.
- **`server/src/shared/events/appEvents.ts`** — typed `emitAppEvent` / `onAppEvent`; email + OAuth login success emit **`auth.signin.success`**; **`bootstrap/registerAppListeners.ts`** registers subscribers (non-prod structured `console.info` hook today).
- **`server/src/middlewares/requestContext.ts`** — `X-Request-Id` propagation; 500 logs in `errorHandler` include request id when present.
- **`server/src/errors/sendAppHttpError.ts`** — same body/headers as `errorHandler` for `AppHttpError` when a handler catches errors inline (Express 4). Example: follow daily cap throws **`RateLimitHttpError`** with `code: DAILY_FOLLOW_LIMIT`, **`Retry-After`** (seconds to UTC midnight), and **`details.limit`**. Webapp **`authFetch`** forwards **`code`**, **`details`**, and **`Retry-After`** into **`AuthError`**.

### Deliberately not urgent

- Zustand auth store (already disciplined).
- ALTCHA middleware design (already isolated).
- OAuth callback orchestration (already strong).
- Follow/analytics features (lower incident blast radius than auth).

---

## Most likely production outages (before “100k users”)

Ordered by how often this **shape** of stack burns teams:

1. **Redis missing or flaky** — OTP, OAuth link keys, idempotency, rate limits, and session store behavior diverge from what worked in local dev.
2. **Email provider failure or misconfiguration** — SMTP auth, Resend domain verification, quotas; users see “broken app” with weak server-side signals.
3. **OAuth redirect / cookie / SameSite** — `FRONTEND_URL`, preview domains, or HTTPS changes; “works locally, fails in prod.”
4. **Multiple app instances + disk uploads** — avatar written on instance A, next read on instance B (hits before user count if you scale out early). **Mitigation path:** implement `UploadStorage` for S3/R2 (same public URL strategy or CDN); keep uploads off local disk in production when running >1 Node process.
5. **Token semantics during an incident** — access token still valid until expiry unless TTL/blocklist strategy is documented and operated.

---

## Pending checklist (planning)

Everything below is **still pending** (shipped items are described in the Month 1–3 sections above). Use it to schedule **urgent vs optional** work.

### Urgent (before real traffic, multi-instance, or serious auth incidents)

| # | Item | Why |
|---|------|-----|
| 1 | **Object storage for uploads (S3/R2 + `UploadStorage`)** | Local disk + **>1 Node** = broken avatars/media; hits early if you scale horizontally. |
| 2 | **Redis health & behavior in prod** | No/flaky Redis breaks OTP, OAuth link nonces, idempotency, rate limits, optional session store. Need **startup checks**, **alerts**, and a **documented degraded mode** (what fails vs what still works). |
| 3 | **Email provider ops** | Misconfigured SMTP/Resend = silent or confusing failures. Need **verified domains**, **quotas**, **monitoring**, and clearer **operator signals** (you have `MailSendError` kinds; still need **retries/metrics** for urgency). |
| 4 | **OAuth / cookies / HTTPS / `FRONTEND_URL`** | “Works locally, fails in prod” class. **Runbook**: preview URLs, SameSite, redirect URIs, env per environment. |
| 5 | **Token / session incident playbook** | Document **access JWT TTL**, **refresh rotation**, **revoke-all**, and what you do under compromise (no code change required, but **urgent for ops**). |

### Important (code quality and maintainability — plan in sprints)

| # | Item | Why |
|---|------|-----|
| 6 | **Split `auth.controller.ts`** (sessions, profile, 2FA, QR, email-change, delete-account, etc.) | Reduces merge conflicts and auth bugs; OTP is already extracted. |
| 7 | **Adopt `*HttpError` + `sendAppHttpError` broadly** | Follow daily cap is the pattern; auth and other APIs still mostly `res.status().json`. Improves **consistent `code` / `details`** for clients. |
| 8 | **Mail resilience** | **Retries/backoff** on transient `MailSendError`; **metrics** by kind (configuration vs transient vs provider) beyond current OTP counters. |
| 9 | **Expand `AppEventMap` + production listeners** | e.g. `otp.sent`, `mail.send_failed`; **`registerAppListeners`** should drive **metrics/alerting**, not only dev `console.info`. |
| 10 | **Session module depth (optional split)** | Dedicated **token** / **revoke** modules *if* you need device graph, stricter revoke semantics, or clearer boundaries (nice after split #6). |

### Optional (contracts, docs, DX, third parties)

| # | Item | Why |
|---|------|-----|
| 11 | **Shared TS contracts outside auth** | Blog, follow, uploads JSON aligned with webapp (same pattern as `@contracts/authApi`). |
| 12 | **Full OpenAPI + optional Swagger UI** | Needed mainly for **external API consumers** or **generated clients**; fragment exists for auth. |
| 13 | **Extend non-auth clients with `code` / `details`** | `authFetch` already surfaces them; **follow/blog/etc.** fetch helpers can mirror that if you want uniform UI handling. |
| 14 | **Structured logging (JSON) + trace/request correlation** | You have **request IDs**; next step is **one log line shape** and optional **OpenTelemetry** — polish, not blocking MVP. |
| 15 | **Audit payload typing** | `AuditMetadataByAction` is partial; tightening over time is **compliance/UX** polish. |

### Operational / documentation (not a single PR, but on the plan)

| # | Item |
|---|------|
| O1 | **Runbooks** for Redis down, email down, OAuth misconfig, and “uploads 404 on another instance.” |
| O2 | **Staging parity** with prod (same Redis, mail, OAuth redirect URLs, HTTPS). |
| O3 | **On-call / alert hooks** once metrics exist (mail failures, OTP spike, 5xx rate). |

### Suggested order for planning (compressed roadmap)

1. **Urgent blockers for scale:** object storage (#1) + Redis/email/OAuth runbooks (#2–#4).
2. **Auth safety:** split `auth.controller` (#6) + wider `*HttpError` on auth paths (#7).
3. **Observability:** mail retries/metrics (#8) + app events + listeners (#9).
4. **Contracts/OpenAPI/clients** (#11–#13) when you care about drift or third parties.
5. **Everything else** (#10, #14–#15, O1–O3) as bandwidth allows.

---

## Code map (post-bootstrap)

| Location | Role |
|----------|------|
| `server/src/app.ts` | Global middleware + `register*` calls only. |
| `server/src/bootstrap/` | Mount order for API, uploads, auth JSON, OAuth. |
| `server/src/shared/redis/keys.ts` | Redis key naming contract. |
| `server/src/modules/auth/auth.routes.ts` | JSON `/auth/*` router (unchanged paths). |

---

*Last updated: pending checklist (planning) section added; Month 2–3 shipped items and code map above.*
