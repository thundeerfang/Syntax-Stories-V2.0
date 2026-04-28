# Auth stack — likely failure order & mitigations

This document records **how the auth stack tends to fail first** (risk ordering) and **what we implemented** in-repo to reduce impact. It complements [`Auth.md`](./Auth.md) and [`EMAIL_OTP_FLOW.md`](./EMAIL_OTP_FLOW.md).

---

## Security invariants *(must never regress)*

These are **contractual properties** of the auth stack. In PR review, prefer asking:

> **Does this change violate a security invariant?**

…instead of re-deriving the whole system from scratch.

| Invariant | What it means (one line) |
|-----------|---------------------------|
| **Newest OTP only** | A successful verify must match the **current** stored OTP payload for that email + purpose. Older sends are rejected via monotonic **`otpVersion`** / `codeVer` (`emailOtp.service.ts`, `failOtpVerification` with `OTP_STALE_VERSION`). |
| **OTP single-use** | After a **successful** email OTP verify, the login/signup OTP key is **deleted** (`deleteEmailOtp`); the same code must not mint another session. |
| **Raw email OTP never persisted** | Redis holds **HMAC** of `(email, code)` with pepper — not the six digits (`hashEmailOtp` / `verifyEmailOtpHash`). |
| **Refresh proves one session row** | Only **`refreshTokenHash`** (SHA-256 of the opaque refresh token) is stored on `Session`; refresh checks **non-revoked** + **unexpired** row. Logout / revoke sets **`revoked`** so that lineage cannot refresh again. |
| **No silent OTP bypass when Redis is required** | Email OTP **send** paths throw if Redis is missing (`Redis required for OTP`). There is **no** “degraded mode” that skips storage while still claiming OTP auth. **Verify** with no Redis client yields **no** stored OTP → verification **fails** (never succeeds without a stored record). |
| **TOTP material is never casually exposed** | **Pending** setup secret: Redis only, TTL-bound (`twoFactorSetup`). **Enabled** secret: MongoDB field with **`select: false`**, loaded only for verify/disable — **not** included in default `/me` shapes. **Never** log the secret or return it in JSON after setup completes. |
| **2FA step-up challenges are one-time** | Challenge tokens are consumed from Redis (`consumeAuthChallenge`); replay with the same token must fail after use. |

### TOTP and “hashed at rest” (reviewer note)

RFC 6238 TOTP needs the **shared secret** to verify codes, so we do **not** store it like a password bcrypt digest (that would make verification impossible without a separate HSM-style API). **Today:** enabled secret is persisted as **base32** in Mongo for `speakeasy.totp.verify`. **Non-regression bar:** keep **`select: false`**, no API leakage, no logs. **Stretch:** envelope encryption / KMS for `twoFactorSecret` at rest.

### PR checklist (30 seconds)

- [ ] OTP path: still **fail-closed** if Redis-backed storage cannot run?
- [ ] Still **deleting** OTP blob after successful verify?
- [ ] **`otpVersion`** still enforced when client sends it?
- [ ] Session **revocation** still touches the **same** model refresh uses?
- [ ] No new endpoint returns **`twoFactorSecret`** or raw refresh token?

---

## Outage & degradation policy *(explicit)*

| Dependency | If unavailable / misconfigured | Declared behavior |
|------------|-------------------------------|-------------------|
| **Redis** (required for email OTP in prod) | Client disconnected or `REDIS_URL` unset while code assumes Redis | **Send**: errors; where caught, **`code: REDIS_UNAVAILABLE`** on 500 (`otp.controller.ts`). **Verify**: no stored OTP → failed verification (not a successful login). **Never**: accept OTP verify without a stored HMAC payload. |
| **Redis** (2FA setup) | Missing during `setupTwoFactor` | Setup throws **`Redis required for 2FA setup`** — no partial enable without pending secret storage. |
| **MongoDB** | Down | Auth routes fail generically; sessions and users unavailable — no alternate “trust the JWT only for new sessions” path documented here. |
| **Mail (SMTP / provider)** | Send failures | OTP email not delivered; user retries. Transient vs auth errors mapped in `otpEmailSendFailureMessage`. |
| **Access JWT** | Still valid after logout | **Known limitation:** access token is not blocklisted; revocation is **session/refresh**-centric until expiry. Invariants above still require refresh cannot extend a **revoked** session. |

---

## Concurrency & ordering *(declared guarantees)*

| Topic | Guarantee | Mechanism / location |
|-------|-----------|----------------------|
| **OTP “version” ordering** | Each successful **send** for a purpose+email **`INCR`s** `otp:codeVer:{purpose}:{email}`; stored payload includes that **`v`**. | `storeEmailOtpLogin` / `storeEmailOtpSignup` |
| **Concurrent sends** | Last **`SETEX`** on `otp:login:{email}` / `otp:signup:{email}` wins; version must match what was last written. | Redis single key per purpose+email |
| **Login vs signup OTP** | Sending one **invalidates** the opposite purpose for that email (`invalidateOppositeEmailOtp`). | Reduces cross-purpose confusion |
| **Rate limits & locks** | Sends and verifies are rate-limited; additional **per-email** locks and attempt counters in Redis (see appendix). | Middleware + `emailOtp.service.ts` |
| **Refresh concurrency** | Refresh updates **`lastActiveAt`** / **`expiresAt`** on the **same** `Session` row; no rotation of refresh token on each refresh in current design — concurrent refresh calls race on last write. | `session.controller.ts` `refresh` |

*If we add **refresh token rotation**, update this table and add an invariant: old refresh must be invalid after rotation.*

---

## Overall maturity note

**Where this doc set sits:** **strong senior** — operational thinking, failure ordering, client/server state awareness, and mitigations tied to real files.

**To earn “staff-shaped” documentation:** this file now makes **invariants**, **outage policy**, and **concurrency** **explicit** so reviewers can gate PRs on them. Remaining gaps are mostly **product/engineering choices** (e.g. access-token blocklist, refresh rotation, TOTP encryption at rest), not missing prose.

---

## 1. OTP / auth-step state consistency *(first)*

**Risk:** Client state (`pendingOtpVersion`, form drafts) diverges from Redis (TTL, resend, `otpVersion`) → confusing failures or retries with stale codes.

**Mitigations in code**

| Change | Location |
|--------|-----------|
| Clear **`pendingOtpVersion`** when the auth dialog closes | `webapp/src/store/auth.ts` — `resetEphemeralOtpState()`; called from `AuthDialog` when `isOpen` → `false` |
| Stable **`code`** on verify failures | `OTP_STALE_VERSION`, `OTP_INVALID` on 401 responses from `failOtpVerification` (`otp.controller.ts`) so clients can branch (e.g. clear version, prompt resend) |
| **`X-OTP-Expires-In-Seconds`** on successful send | Login + signup email OTP responses — clients can align UI countdowns with server TTL |

**Still manual / product**

- Multi-tab: two tabs sending OTP — user should use the **latest** email; `otpVersion` enforces this server-side.
- After profile **409** conflicts, see [`PROFILE_VERSION_CONFLICT.md`](./PROFILE_VERSION_CONFLICT.md).

---

## 2. Dependency fragility *(second — implicit)*

**Risk:** Redis or mail provider unavailable → hard failures for OTP and rate limits.

**Mitigations in code**

| Change | Location |
|--------|-----------|
| **`redis: true \| false`** on **`GET /auth/status`** | Lets operators and synthetic checks see Redis connectivity without hitting OTP |
| Structured **`code: REDIS_UNAVAILABLE`** when OTP storage cannot run | `otp.controller.ts` 500 responses when the error indicates Redis is required for OTP |

**Operational**

- Set **`REDIS_URL`** in production; monitor `/auth/status`.
- Mail: SMTP / Resend — see `sendAuthEmail.ts`.

---

## 3. Refresh token revocation gaps *(third)*

**Risk:** User thinks “logged out” but **refresh** still works if logout request failed or only access JWT was dropped client-side.

**Mitigations in code**

| Change | Location |
|--------|-----------|
| **Dual revoke on logout** | `webapp/src/store/auth.ts` — after `POST /auth/logout` (Bearer), call **`POST /auth/revoke-session`** with **`refreshToken`** when present |
| **`logout` API accepts optional `refreshToken` in body** | `webapp/src/api/auth.ts` + `session.controller.ts` — server revokes by **`sessionId` from JWT** first; if **`refreshToken`** is sent, also revokes matching session for that user (belt-and-suspenders) |

Access JWTs remain valid until **expiry** unless you add a blocklist (not in scope here).

---

## 4. Controller complexity *(fourth)*

**Risk:** Large controllers mix validation, security, audit, and session issuance → regressions when changing one path.

**Mitigations**

| Now | Next (recommended) |
|-----|----------------------|
| Documented here | Extract **`failOtpVerification`** + OTP attempt keys into `modules/auth/services/otpVerify.service.ts` |
| | Split **`otp.controller.ts`** send vs verify vs ALTCHA challenge |

No large refactor in this pass — track extractions as follow-up PRs.

---

## 5. Redis operational hygiene *(fifth)*

**Risk:** Memory growth, eviction policy vs auth keys, single-node blast radius.

**Mitigations**

| Artifact | Purpose |
|----------|---------|
| **[Redis keys & TTL catalog](#appendix-redis-auth-related-keys--ttl)** (below) | Single place to audit TTLs and namespaces |
| `server/src/shared/redis/keys.ts` | Canonical key builders — extend here, not ad-hoc strings |

**Operational (your runbook)**

- Prefer **`volatile-lru`** or explicit TTL on every ephemeral key (OTP, rate limit, idempotency).
- Monitor memory; alert on **evictions** if you rely on Redis for correctness (sessions in Redis would be critical; this app uses **Mongo for sessions** for refresh revocation).

---

## Appendix: Redis auth-related keys & TTL

Sources: `server/src/shared/redis/keys.ts`, `server/src/services/emailOtp.service.ts`, rate-limit middleware, `twoFactor.controller.ts` (setup TTL). Exact TTLs may follow `auth.config` / `env` (e.g. `OTP_*_TTL_SECONDS`).

| Key pattern | Purpose | TTL (typical) |
|-------------|---------|----------------|
| `otp:login:{email}` | Hashed login OTP payload | `OTP_LOGIN_TTL_SECONDS` (≥ 60s clamp) |
| `otp:signup:{email}` | Hashed signup OTP + `fullName` | `OTP_SIGNUP_TTL_SECONDS` |
| `otp:codeVer:{purpose}:{email}` | Monotonic version for resend | Implicitly extended by writes |
| `otp:resend:{purpose}:{email}` | Min gap between sends | `max(15, OTP_MIN_RESEND_SECONDS)` |
| `otp:send:lock:{email}` | Escalating lock after burst | 10–60 min (strike-based) |
| `otp:send:count:{email}` | Sends in rolling window | `OTP_SEND_WINDOW_SEC` (10 min) |
| `otp:send:strike:{email}` | Strike counter | 90 days |
| `otp:attempts:{email}` | Failed verify attempts | 5 min after first failure |
| `otp:attempts:*` | Same | Block window |
| `auth:challenge:{hash}` | 2FA step-up | From `authChallenge` |
| `2fa:setup:{userId}` | Pending TOTP secret | 10 min |
| `emailchange:{userId}` | Email change codes | 10 min |
| `idem:{clientKey}` | Idempotency | Per middleware |
| `rl:sendotp:*`, `rl:verifyotp:*`, … | HTTP rate limits | Per `express-rate-limit` store |
| `link:*`, `oauth:exchange:*` | OAuth | Short-lived |

---

## Related files

| Area | Path |
|------|------|
| OTP send/verify | `server/src/modules/auth/controllers/otp.controller.ts` |
| Email OTP storage | `server/src/services/emailOtp.service.ts` |
| Sessions / logout | `server/src/modules/auth/controllers/session.controller.ts` |
| Auth UI state | `webapp/src/store/auth.ts`, `webapp/src/features/auth/components/AuthDialog.tsx` |
| Redis keys | `server/src/shared/redis/keys.ts` |
| Redis client | `server/src/config/redis.ts` |

---

*Last updated: adds security invariants, outage policy, and concurrency declarations; aligns with implemented mitigations (logout dual revoke, OTP headers/codes, status `redis`, ephemeral OTP reset).*
