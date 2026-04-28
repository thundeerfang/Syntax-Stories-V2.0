# Email OTP — generation, formula, storage, and mail flow

This document describes how **Syntax Stories** creates email one-time passwords (OTP), what cryptographic operations are used, how codes reach the user’s inbox, and how verification works end-to-end.

**Primary code:** `server/src/services/emailOtp.service.ts`, `server/src/modules/auth/controllers/otp.controller.ts`, `server/src/infrastructure/mail/sendAuthEmail.ts`.  
**HTTP routes (mounted under `/auth`):** `server/src/modules/auth/auth.routes.ts`.

---

## High-level flow

```text
Client                          API                              Redis / Mongo / Mail
  |                              |                                      |
  |-- POST /auth/send-otp ------>| Check user exists, rate limits       |
  |    (or signup-email)         | Invalidate opposite purpose OTP      |
  |                              | generateEmailOtpDigits()             |
  |                              | store hash + otpVersion in Redis ----> SET otp:login:email (TTL)
  |                              | sendAuthEmail(html with code) ----------------> SMTP or Resend
  |<-- 200 { otpVersion } -------|                                      |
  |                              |                                      |
  |-- POST /auth/verify-otp --->| Load stored hash by email            |
  |    { email, code, otpVersion } | timing-safe compare HMAC        |
  |                              | On success: DEL OTP key, issue JWT   |
  |<-- 200 session / 2FA ------->|                                      |
```

**Purposes:** **`login`** (existing user) and **`signup`** (no user yet; Redis also stores **`fullName`** until verify creates the account).

---

## 1. How the OTP code is created (no “formula” in the math sense)

The visible code is **not** derived from email, time, or a counter. It is **random**:

| Step | Implementation |
|------|------------------|
| RNG | Node.js **`crypto.randomInt(100000, 999999)`** in **`generateEmailOtpDigits()`** (`emailOtp.service.ts`). |
| String form | **`String(...)`** so the payload is a **6-character decimal string** (e.g. `"482913"`). |

**Node.js note:** `crypto.randomInt(min, max)` returns integers with **`min <= n < max`** (upper bound is **exclusive**). So with `(100000, 999999)` the largest value is **999998**. Every value still has **six digits** (100000–999998). If you need true **100000–999999** inclusive, the upper argument would be **`1000000`** — that would be a product change, not documented behavior today.

There is **no** TOTP/time-based step here (that is separate: **2FA** uses Speakeasy TOTP in `twoFactor.controller.ts`).

---

## 2. How the code is stored (hash “formula”)

The **plaintext OTP is never written to Redis**. Only a **hash** and metadata are stored.

| Piece | Meaning |
|--------|---------|
| **Pepper** | `OTP_PEPPER` env, or fallback **`JWT_SECRET`**, or dev default (see `otpPepper()`). In **production**, a dedicated **`OTP_PEPPER`** is strongly recommended. |
| **Hash** | **`HMAC-SHA256(pepper, `${emailNorm}:${code}`)`** → **hex string** via **`hashEmailOtp()`**. |
| **Verify** | **`verifyEmailOtpHash(storedHex, emailNorm, code)`** recomputes the HMAC and compares with **`crypto.timingSafeEqual`** on equal-length buffers (mitigates timing leaks). |

So the “formula” for verification is:

\[
\text{stored} = \text{HMAC-SHA256}(\text{pepper},\, \text{emailNorm} + ":" + \text{code})
\]

with **constant-time** comparison against user input.

**Redis value (JSON):**

- **Login:** `{ "h": "<hex>", "v": <number> }`
- **Signup:** `{ "h": "<hex>", "fullName": "...", "v": <number> }`

**TTL:** **`OTP_LOGIN_TTL_SECONDS`** / **`OTP_SIGNUP_TTL_SECONDS`** from env (defaults **300s** login, **600s** signup), with a minimum of **60s** enforced in `ttlForPurpose()`.

---

## 3. `otpVersion` (anti-stale code after resend)

Each successful store increments a Redis counter keyed by **`otp:codeVer:{purpose}:{emailNorm}`** and saves the current value as **`v`** on the OTP payload.

- The **send** response includes **`otpVersion`** for the client to echo on verify.
- **`verifyOtp`** rejects if **`otpVersion`** does not match **`stored.v`** (**`stale_otp_version`**) so an **old email** cannot be used after a **new** code was sent.

---

## 4. Sending email (SMTP / Resend)

**`sendAuthEmail({ to, subject, html })`** (`sendAuthEmail.ts`):

1. If **SMTP** is configured, try **`sendViaSmtp`** first.
2. On failure or missing SMTP, try **Resend** if **`RESEND_API_KEY`** is set.
3. If neither works, sending fails and the controller returns **500** (with messages that distinguish Redis missing vs mail auth errors).

**Templates (inline HTML in `otp.controller.ts`):**

| Flow | Subject (example) | Body highlights |
|------|-------------------|----------------|
| Login | `Your Syntax Stories login code` | Heading + monospace-style **code** + expiry minutes from **`OTP_LOGIN_TTL_SECONDS`**. |
| Signup | `Verify your Syntax Stories account` | Same pattern with **`OTP_SIGNUP_TTL_SECONDS`**. |

**Precondition:** **`isAuthEmailConfigured()`** — at least one of SMTP transporter or Resend must be available; otherwise **503** on send.

---

## 5. HTTP API summary

| Method | Path | Handler | Role |
|--------|------|---------|------|
| `GET` | `/auth/altcha/challenge` | `getAltchaChallenge` | PoW challenge for clients that use ALTCHA before send. |
| `POST` | `/auth/send-otp` | `sendOtp` | Login: user **must exist**; send code. |
| `POST` | `/auth/signup-email` | `signupEmail` | Signup: user **must not exist**; send code + store `fullName` in Redis. |
| `POST` | `/auth/verify-otp` | `verifyOtp` | Verify code; **login** issues session or **2FA** branch; **signup** creates user then session. |

Middleware on these routes typically includes **rate limiting**, **idempotency**, **ALTCHA** when configured, and **Zod validation** (`authValidation`).

---

## 6. Verification steps (server)

1. Normalize **`email`** (lowercase, trim).
2. Normalize **`code`**: strip non-digits, take first **6** digits; require length **6**.
3. **Rate limit** failed attempts: Redis key **`otp:attempts:{email}`** — after **10** failures within the window, **429** with **`Retry-After`** (**5 minutes** TTL on the counter key).
4. Decide **purpose:** if a **User** exists for that email → **`login`**, else **`signup`**.
5. Load **`otp:login:...`** or **`otp:signup:...`**; check **`otpVersion`** vs **`v`**; **`verifyEmailOtpHash`**.
6. On success: **delete** OTP key, **clear** attempt counter, then **`respondWithSessionAfterEmailAuth`** (JWT/session + optional **2FA** challenge).

---

## 7. Abuse controls (besides HTTP rate limits)

| Mechanism | Where | Behavior |
|-----------|--------|----------|
| **Min resend gap** | `assertOtpMinResendOrReject` | **`OTP_MIN_RESEND_SECONDS`** (default **60**); **429** + **`Retry-After`**, code **`RESEND_TOO_SOON`**. |
| **Resend gate** | `markOtpResendGate` | Set after successful send. |
| **Per-email send budget** | `registerEmailOtpSendOrReject` | Count sends in a **10-minute** window; more than **10** triggers **escalating lockouts** (10m → 20m → 30m → 60m) tracked with **`otp:send:strike`**. |
| **Single active challenge** | `invalidateOppositeEmailOtp` | Starting **login** OTP clears **signup** OTP for that email and vice versa. |
| **Redis required** | `storeEmailOtp*` | OTP storage throws if Redis is unavailable (**500** / user-facing “try again” depending on path). |

---

## 8. Environment variables (OTP-related)

| Variable | Role |
|----------|------|
| **`OTP_PEPPER`** | Secret mixed into HMAC (preferred in production). |
| **`JWT_SECRET`** | Fallback pepper if `OTP_PEPPER` unset (dev). |
| **`OTP_LOGIN_TTL_SECONDS`** | Login code lifetime (default **300**). |
| **`OTP_SIGNUP_TTL_SECONDS`** | Signup code lifetime (default **600**). |
| **`OTP_MIN_RESEND_SECONDS`** | Minimum seconds between sends per purpose/email (default **60**). |
| **`ALTCHA_HMAC_KEY`** / **`JWT_SECRET`** | ALTCHA challenge signing. |
| **`ALTCHA_REQUIRED`** | When true, send endpoints require ALTCHA when configured. |
| SMTP / **`RESEND_API_KEY`** | Outbound mail (see mail module). |

---

## 9. Audit and metrics

- **Audit:** `OTP_SENT`, `OTP_VERIFIED`, `OTP_FAILED` (with reasons like **`invalid_otp`**, **`stale_otp_version`**).
- **Metrics:** `otp_send_total`, `otp_send_rejected_total`, `otp_verify_success_total`, `otp_verify_fail_total` (`otpMetrics`).

---

## 10. Client contract (webapp)

- After **send** / **signup-email**, persist **`otpVersion`** from JSON and send it with **`verify-otp`** (`webapp` auth store uses **`pendingOtpVersion`** for this).
- Display **6-digit** entry; server strips non-digits.

---

## Related docs

- [`Auth.md`](./Auth.md) — broader auth routes and behavior (if present in repo).
- **2FA** — separate from email OTP; uses **TOTP** (time-based) in `twoFactor.controller.ts`.

---

*Last updated: reflects `emailOtp.service.ts`, `otp.controller.ts`, `sendAuthEmail.ts`, `redis/keys.ts`, `auth.config.ts`, `env.ts`.*
