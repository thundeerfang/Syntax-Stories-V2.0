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
- **`server/src/shared/events/appEvents.ts`** — typed `emitAppEvent` / `onAppEvent`; email + OAuth login success emit **`auth.login.success`**; **`bootstrap/registerAppListeners.ts`** registers subscribers (non-prod structured `console.info` hook today).
- **`server/src/middlewares/requestContext.ts`** — `X-Request-Id` propagation; 500 logs in `errorHandler` include request id when present.

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

## Suggested next PRs (after this baseline)

1. Extract **first** auth vertical from `auth.controller.ts` (e.g. OTP-only) into `modules/auth/controllers/otp.controller.ts` and re-export handlers.
2. Split **`infrastructure/mail`** into `provider/smtpProvider.ts` and `provider/resendProvider.ts` with shared error typing.
3. Add **`shared/audit/events.ts`** — start with string unions used by `writeAuditLog` today; expand payloads gradually.

---

## Code map (post-bootstrap)

| Location | Role |
|----------|------|
| `server/src/app.ts` | Global middleware + `register*` calls only. |
| `server/src/bootstrap/` | Mount order for API, uploads, auth JSON, OAuth. |
| `server/src/shared/redis/keys.ts` | Redis key naming contract. |
| `server/src/modules/auth/auth.routes.ts` | JSON `/auth/*` router (unchanged paths). |

---

*Last updated: Month 2–3 contracts, audit taxonomy, storage paths, error/event/request-id wiring; see sections above.*
