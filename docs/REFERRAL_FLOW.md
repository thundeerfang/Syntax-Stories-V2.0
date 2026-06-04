# Referral invite — end-to-end flow

This document describes how **Syntax Stories** referral invites work from link share through signup attribution, notifications, and the invite dashboard.

**Related specs:** `docs/INVITE_FRIEND_PRODUCTION_README.md` (production architecture), `docs/EMAIL_OTP_FLOW.md` (email signup).

**Primary code:**

| Area | Path |
|------|------|
| Referral service | `server/src/services/referral.service.ts` |
| Invite HTTP routes | `server/src/routes/invite.routes.ts`, `server/src/controllers/invite.controller.ts` |
| Email signup attribution | `server/src/modules/auth/controllers/otp.controller.ts` |
| OAuth signup attribution | `server/src/oauth/oauth.service.ts`, `server/src/oauth/oauthSignupState.ts` |
| Signup UI (referral field) | `webapp/src/features/auth/components/SignupReferralField.tsx`, `webapp/src/features/auth/hooks/useSignupReferralCode.ts` |
| Invite landing | `webapp/src/app/invite/[code]/page.tsx` |
| Invite dashboard | `webapp/src/app/invite/page.tsx` |

---

## High-level diagram

```text
Referrer shares link/code
        │
        ▼
Referee opens invite (link, ?ref=, or manual code at signup)
        │
        ├── /invite/{code}  → sessionStorage + signed ss_ref cookie
        ├── /signup?ref=    → sessionStorage
        └── Auth dialog     → optional field + GET /api/invites/resolve
        │
        ▼
Referee completes signup (OAuth or email OTP)
        │
        ▼
resolveReferralInput(req)  →  applyReferralOnNewUser()
        │
        ├── User.referredByUserId set (once, idempotent)
        └── emitAppEvent('referral.converted')
                    │
                    ▼
            Notification to referrer + stats on /invite
```

---

## 1. Referrer: getting a code and sharing

### 1.1 Code generation

Each user gets a stable **Crockford base32** referral code (8–16 chars, no I/L/O/U):

- Generated lazily by `ensureReferralCodeForUser(userId)` on first visit to **`GET /api/invites/me`** (auth required).
- Stored on `User.referralCode` with a unique index.

### 1.2 Share surfaces

| Surface | URL / action |
|---------|----------------|
| Invite page (`/invite`) | Shows code, copy link, copy attach URL |
| Direct link | `{frontend}/invite/{CODE}` |
| Attach URL (sets cookie) | `{backend}/api/invites/attach?code={CODE}&next=/` |
| Query param | `{frontend}/signup?ref={CODE}` |

**Authenticated APIs (referrer):**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/invites/me` | Own code, `inviteUrl`, `attachUrl` |
| `GET` | `/api/invites/stats` | `{ converted: number }` |
| `GET` | `/api/invites/referred?limit=&skip=` | Paginated list of referees |

---

## 2. Referee: capturing the referral before signup

Referral can reach the client through **three channels** (any combination; resolver picks one at signup — see §4).

### 2.1 Invite link (`/invite/{code}`)

File: `webapp/src/app/invite/[code]/page.tsx`

1. Normalizes code to uppercase.
2. Writes `pendingReferralCode` to **sessionStorage** (backup for email verify body).
3. Redirects browser to **`GET /api/invites/attach?code=…&next=/`** on the API origin.
4. Attach handler validates code, sets **httpOnly signed cookie** `ss_ref` (30 days), redirects to frontend.

### 2.2 Signup query param (`/signup?ref=`)

File: `webapp/src/app/signup/page.tsx`

1. Reads `?ref=` from URL.
2. Stores uppercase code in **sessionStorage** (`pendingReferralCode`).
3. Opens auth dialog on signup view.

### 2.3 Signup dialog — “Invite friends” field (manual entry)

Files:

- `webapp/src/features/auth/components/SignupReferralField.tsx` — UI on **Create account** and **Sign up with email** steps.
- `webapp/src/features/auth/hooks/useSignupReferralCode.ts` — validation + persistence.
- `webapp/src/lib/referral/referralCode.ts` — client-side normalize (matches server).
- `webapp/src/api/invite.ts` — `inviteApi.resolveCode()`.

**Behavior:**

| Step | Detail |
|------|--------|
| Optional | Empty field → signup proceeds with no referral. |
| Format | Client normalizes: trim, uppercase, regex `^[0-9A-HJKMNP-TV-Z]{8,16}$`. |
| Live check | After 8+ chars, debounced **450ms** → `GET /api/invites/resolve?code=` |
| Valid code | Shows “Invited by {fullName}”, writes `pendingReferralCode` to sessionStorage. |
| Invalid / not found | Inline error; signup buttons disabled until fixed or cleared. |
| Prefill | On dialog open, loads and re-validates code from sessionStorage (invite link / `?ref=` flows). |

**Public validation API:**

```http
GET /api/invites/resolve?code=ABC12345
```

Response (valid):

```json
{
  "valid": true,
  "username": "jane",
  "fullName": "Jane Doe",
  "profileImg": "https://..."
}
```

Response (unknown or bad format):

```json
{ "valid": false }
```

Rate-limited via `rateLimitInviteResolve` (see `server/src/middlewares/auth/rateLimitAuth.ts`).

---

## 3. Signup paths and how the code is carried

### 3.1 Email OTP signup

```text
Auth dialog: name + email + optional referral field
        │
        ▼
POST /auth/signup-email  { fullName, email, altcha? }
        │
        ▼
POST /auth/verify-otp    { email, code, otpVersion?, referralCode?, acceptPolicies? }
        │
        ▼
createUserFromEmailSignup → resolveReferralInput(req) → applyReferralOnNewUser
```

- **`referralCode` in verify body** comes from `sessionStorage.pendingReferralCode` (`webapp/src/store/auth.ts`).
- Set by invite link, `?ref=`, or validated signup field before OTP verify.
- **`resolveReferralInput` priority:** body → signed cookie `ss_ref` → OAuth Redis nonce (N/A for email).

### 3.2 OAuth signup

```text
Auth dialog: user enters/validates referral (optional)
        │
        ▼
Social button → {backend}/auth/{provider}/signup?ref={CODE}
        │
        ▼
buildOAuthSignupState: stores code in Redis under signup nonce (10 min TTL)
        │
        ▼
OAuth callback (new user) → resolveReferralInput → applyReferralOnNewUser (source: oauth)
```

- OAuth href includes `?ref=` when field is validated or sessionStorage has a pending code.
- If Redis is down, signup still succeeds; attribution may be skipped (fail-open).

---

## 4. Server: single resolver and apply

### 4.1 `resolveReferralInput(req)`

Order (documented policy):

1. **`req.body.referralCode`** — explicit (email verify)
2. **Signed cookie `ss_ref`** — from `/api/invites/attach`
3. **OAuth nonce** — `state=signup:{nonce}` → Redis `invite:oauthSignup:{nonce}`

Redis errors are logged and degraded; signup never fails because of referral infrastructure.

### 4.2 `applyReferralOnNewUser`

Only runs when `REFERRALS_ENABLED` is true and user is **brand new**.

Guards:

- Invalid / unknown code → log `referral_invalid`, no-op
- Self-referral → no-op
- **Idempotent DB write:** `updateOne({ _id, referredByUserId: null }, { $set: { referredByUserId, referredAt, … } })`

On success:

- Sets `referredByUserId`, `referredAt`, `referralCapturedAt`, optional `referralSource`
- Emits **`referral.converted`** with `{ referrerId, refereeUserId, source }`

### 4.3 Code lookup cache

`lookupReferrerIdByCode` uses Redis key `invite:code:{CODE}`:

- Hit → referrer Mongo `_id`
- Negative sentinel `__NONE__` → skip DB (5–10 min)
- Positive → 24h TTL

---

## 5. After conversion

### 5.1 Referrer notification

`server/src/services/notifications/notification.listener.ts` listens for `referral.converted`:

- Type: **`referral_accepted`**
- Title: “Invite accepted”
- Message: “{name} joined Syntax Stories using your invite.”
- Link: `/invite`

### 5.2 Invite dashboard

`/invite` (authenticated):

- Loads `/api/invites/me`, `/stats`, `/referred`
- Shows conversion count and roster (empty state when no referrals)
- Copy link / code / attach URL

### 5.3 Achievements and gamification (gap)

**Today:** `referral.converted` powers notifications only. No `UserStats.referralsConverted`, no `RewardGrant`, no gamification worker routing.

**Signed-off target:** increment **`UserStats.referralsConverted`** on verified conversion; route rewards through **`RewardEngine.grant`** and the unified **Gamification Worker** (§13). See **`docs/ACHIEVEMENTS_FLOW.md`** for achievement engine details — merge workers, do not duplicate.
---

## 6. Environment and flags

| Variable | Role |
|----------|------|
| `REFERRALS_ENABLED` | Master switch for `applyReferralOnNewUser` |
| `REFERRAL_SIGNING_SECRET` | HMAC for `ss_ref` cookie (required in production for attach) |
| `NEXT_PUBLIC_API_BASE_URL` | Webapp → API for resolve, attach, OAuth |
| `BACKEND_URL` | Used in `/api/invites/me` attach URL |
| Redis | OAuth nonce + code cache (optional; fail-open) |

---

## 7. Validation rules (client + server)

Both sides use the same normalization:

```ts
// trim → toUpperCase → length 8–16 → REFERRAL_CODE_REGEX
/^[0-9A-HJKMNP-TV-Z]{8,16}$/
```

**Client-only UX:**

- Blocks signup while a non-empty code is invalid or still checking.
- Does **not** block signup when field is empty.

**Server:**

- Invalid codes never break signup; attribution is silently skipped.
- Resolve endpoint returns `{ valid: false }` without leaking whether format vs existence (200 status).

---

## 8. Testing checklist

### Referrer

- [ ] Log in → `/invite` → code appears; copy link works.
- [ ] `GET /api/invites/stats` increments after a successful referee signup.

### Referee — link flow

- [ ] Open `/invite/{validCode}` in incognito → lands on home with cookie set.
- [ ] Sign up (email or OAuth) → referrer sees notification and roster entry.

### Referee — manual code at signup

- [ ] Open signup dialog → enter invalid code → inline error, buttons disabled.
- [ ] Enter valid code → “Invited by …” → complete email signup → attribution applied.
- [ ] Clear field → signup works without referral.

### Referee — `?ref=` flow

- [ ] Visit `/signup?ref={code}` → dialog opens with field prefilled and validated.

### Edge cases

- [ ] Self-referral code → signup succeeds, no `referredByUserId`.
- [ ] Second signup attempt with same user → referral not overwritten (idempotent).
- [ ] Redis down → signup still completes (attribution may be missing for OAuth-only path).

---

## 9. File map (quick reference)

```text
webapp/
  src/app/invite/[code]/page.tsx     # Landing → attach + sessionStorage
  src/app/signup/page.tsx            # ?ref= capture
  src/app/invite/page.tsx            # Referrer dashboard
  src/features/auth/
    components/SignupReferralField.tsx
    components/authDialogRender.tsx  # Field on signup steps
    components/AuthDialog.tsx        # ensureReferralReadyForSignup on submit
    hooks/useSignupReferralCode.ts
  src/lib/referral/referralCode.ts
  src/api/invite.ts
  src/store/auth.ts                  # referralCode on verify-otp body

server/
  src/services/referral.service.ts
  src/controllers/invite.controller.ts
  src/routes/invite.routes.ts
  src/oauth/oauthSignupState.ts
  src/modules/auth/controllers/otp.controller.ts
```

---

## 10. Implementation status

| Feature | Status |
|---------|--------|
| ReferralService + resolver | Done |
| Invite link + attach cookie | Done |
| `/signup?ref=` capture | Done |
| Signup dialog referral field + resolve API | Done |
| Email verify body + sessionStorage | Done |
| OAuth `?ref=` + Redis nonce | Done |
| Referrer notifications | Done |
| Invite dashboard + roster | Done |
| `ReferralConversion` collection + dual-write | **Done** |
| `UserStats.referralsConverted` / `referralsPending` | **Done** |
| `GET /api/invites/referred` from `ReferralConversion` | **Done** |
| Legacy `User.referredByUserId` backfill on startup | **Done** |
| `ReferralFraudCheck` + pending/verified/rejected state machine | **Done** |
| `GamificationOutboxEvent` + `Gamification Worker` (unified stream) | **Done** |
| `RewardEngine.grant` + `RewardGrant` ledger | **Done** |
| Referral XP reward (`REFERRAL_REFERRER_XP`, default 100) | **Done** |
| Invite achievements (`invite-1`, `invite-5`, `invite-10`) | **Done** |
| `GET /api/invites/leaderboard` + Redis ZSET | **Done** |
| `POST /api/invites/share` + webapp copy tracking | **Done** |
| `referral:user:{id}:stats` Redis cache | **Done** |
| `REFERRAL_QUALIFY_MODE=profile` deferred conversion | **Done** (env) |
| Campaigns / seasonal referral events | Not started |

**Env flags:** `REFERRAL_ASYNC=1` (with Redis), `REFERRAL_QUALIFY_MODE=signup|profile`, `REFERRAL_REFERRER_XP=100`, `REFERRAL_VELOCITY_LIMIT=25`.

**Primary new code:**

| Area | Path |
|------|------|
| ReferralConversion model | `server/src/models/ReferralConversion.js` |
| RewardGrant / GamificationOutbox | `server/src/models/RewardGrant.js`, `GamificationOutboxEvent.js` |
| Conversion + fraud + stats cache | `server/src/services/referral/` |
| Gamification worker + referral processor | `server/src/services/gamification/` |
| Leaderboard + share API | `server/src/controllers/invite.controller.ts` |

---

## 11. Production review — final scorecard

After the latest revision, the referral **platform design** (not just the live feature) is approaching **production-grade**. Scores reflect **target state once sprints 1–5 ship**, against the architecture in §14.

| Area | Score | Notes |
|------|-------|-------|
| Attribution | 10/10 | Multi-channel capture, resolver chain, OAuth + cookie + body |
| Reliability | 9/10 | Fail-open signup; outbox + gamification worker closes side-effect gaps |
| Scalability | 9/10 | `ReferralConversion` + Redis stats cache; no roster scans at 10k+ |
| Security | 9/10 | Signed cookie, normalize-before-DB, rate limits |
| Fraud prevention | 8.5/10 | Device/IP/velocity checks + pending/verified state machine |
| Gamification integration | 9/10 | Single worker routes referral, achievement, XP, quest events |
| Analytics readiness | 10/10 | Full funnel including **`referral.share`** |
| Enterprise readiness | 9.5/10 | Auditable `RewardGrant` ledger, split stats/gamification models |

**Live today:** attribution + notifications (§1–9). **Remaining work:** sprints in §19 — no further architecture churn.

---

## 12. Strengths (keep as-is)

### 12.1 Multi-channel attribution

```text
/invite/{CODE}          → sessionStorage + signed ss_ref cookie
/signup?ref={CODE}      → sessionStorage
Signup dialog           → manual entry + GET /api/invites/resolve
Email OTP verify        → referralCode body
OAuth signup            → ?ref= → Redis nonce → state
```

### 12.2 Fallback chain

```text
Body (explicit intent) → Signed cookie (ss_ref) → OAuth Redis nonce
```

### 12.3 Operational safety

- Invalid codes never break signup; Redis fail-open.
- **`referredByUserId`** set at most once (conditional Mongo update).
- **`referral.converted`** powers referrer notifications today.

---

## 13. Signed-off platform design

### 13.1 Final architecture

```text
Mongo
 ├─ User
 ├─ UserStats              # operational counters only
 ├─ UserGamification       # XP, level, season/quest points
 ├─ ReferralConversion
 ├─ AchievementUnlock
 ├─ AchievementProgress
 ├─ RewardGrant            # auditable reward ledger
 ├─ OutboxEvent            # unified (achievement + referral + …)
 └─ AuditLog

Redis
 ├─ Streams                # single consumer group
 ├─ Referral cache         # invite:code, referral:user:{id}:stats
 ├─ Catalog cache
 ├─ Leaderboards           # referral:leaderboard (ZSET)
 └─ Locks

Gamification Worker       # ONE worker — not separate referral/achievement workers
 ├─ Referral Processor
 ├─ Achievement Processor
 ├─ XP Processor
 ├─ Reward Processor
 └─ Quest Processor

Notification Service
 ├─ SSE
 ├─ Push
 └─ Email
```

This foundation supports referral campaigns, invite rewards, XP, achievements, quests, seasonal events, creator programs, and leaderboards **without another major redesign**.

### 13.2 One worker, not two

**Do not ship:**

```text
Redis Stream
 ├─ Achievement Worker
 └─ Referral Worker
```

**Ship instead:**

```text
Redis Stream
      │
      ▼
Gamification Worker
      │
      ├─ Achievement Processor
      ├─ Referral Processor
      ├─ Reward Processor
      ├─ XP Processor
      └─ Quest Processor
```

Events routed in one process:

```text
referral.converted
achievement.unlocked
quest.completed
respect.given
blog.read
```

**Why:** avoids duplicated Redis connections, retry logic, DLQ handling, monitoring, and deployment pipelines. Extend the existing achievement worker pattern rather than forking a second service.

### 13.3 `UserStats` vs `UserGamification`

Do **not** grow `UserStats` into a 40+ counter document. Split concerns:

**`UserStats`** — operational metrics:

```ts
{
  userId,
  followersCount,
  followingCount,
  postsCount,
  briefsRead,
  referralsConverted   // increment on verified referral
}
```

**`UserGamification`** — game mechanics:

```ts
{
  userId,
  xp,
  level,
  achievementPoints,
  seasonPoints,
  questPoints
}
```

Referral dashboard counts read **`UserStats.referralsConverted`** (or Redis cache — §13.7). XP grants update **`UserGamification`** via **`RewardEngine`**.

### 13.4 `ReferralConversion` model

Source of truth for roster, analytics, and rewards. Denormalize reward summary on the document to avoid joins on dashboard reads.

```ts
ReferralConversion {
  referrerId: ObjectId;
  refereeId: ObjectId;     // unique — one row per referee

  status: ReferralStatus;  // pending | verified | rewarded | expired | rejected

  source: string;          // email | oauth | link | …

  qualifiedAt?: Date;
  rewardedAt?: Date;
  rewardAmount?: number;   // denormalized for /invite stats

  deviceHash?: string;
  ipHash?: string;

  createdAt: Date;
  convertedAt?: Date;
}
```

Indexes: `{ referrerId: 1, createdAt: -1 }`, `{ refereeId: 1 }` unique.

Keep **`User.referredByUserId`** as a fast profile denormalization; list APIs migrate to **`ReferralConversion`**.

### 13.5 Referral state machine

```text
Pending   → signup attributed, not yet qualified / fraud-checked
  ↓
Verified  → passed fraud + qualification
  ↓
Rewarded  → RewardEngine.grant completed
  ↓
Expired   → qualification window closed
Rejected  → fraud or policy
```

Emit **`referral.converted`** on transition to **`verified`** (not raw signup). Emit **`referral.rewarded`** after grant.

**Qualified conversion examples (Syntax):**

```text
Signup + read 3 articles
Signup + complete profile
Signup + publish first post
```

### 13.6 Reward engine — single grant ledger

**Do not create** separate `ReferralRewardService`, `AchievementRewardService`, `QuestRewardService`.

**Ship one:**

```ts
RewardEngine.grant(args)
```

**`RewardGrant`** — fully auditable:

```ts
RewardGrant {
  _id,
  userId,
  sourceType,    // "referral" | "achievement" | "quest" | …
  sourceId,      // referralConversionId, achievementId, …
  rewardType,    // "xp" | "badge" | "coins" | …
  amount?,
  createdAt
}
```

Examples:

```ts
{ sourceType: "referral", sourceId: referralId, rewardType: "xp", amount: 100 }
{ sourceType: "achievement", sourceId: achievementId, rewardType: "badge" }
```

Idempotency key: `userId + sourceType + sourceId + rewardType`. Update **`ReferralConversion.rewardAmount`** / **`rewardedAt`** on grant for dashboard display.

### 13.7 Redis keys (complete)

| Key | Purpose |
|-----|---------|
| `invite:code:{CODE}` | Referrer lookup cache (live) |
| `invite:oauthSignup:{nonce}` | OAuth ref carry (live) |
| `referral:leaderboard` | ZSET — top inviters by `referralsConverted` |
| `referral:user:{userId}:stats` | Short-TTL dashboard cache, e.g. `{ converted: 25, pending: 4, rewarded: 20 }` |
| `referral:fraud:device:{hash}` | Optional velocity / negative cache |

The **`referral:user:{userId}:stats`** cache reduces load on `/invite` and `/api/invites/stats`; invalidate on conversion state change.

### 13.8 Event funnel (analytics)

```text
referral.share            # NEW — channel attribution (whatsapp, twitter, copy_link, …)
referral.clicked
referral.attached
referral.signup_started
referral.signup_completed
referral.qualified
referral.converted        # verified
referral.rewarded
referral.rejected
```

**Share tracking** closes the top of the funnel:

```text
Shares → Clicks → Signups → Qualified → Rewarded
```

Without **`referral.share`**, channel performance (WhatsApp vs X vs copy link) cannot be measured.

Example payload:

```ts
{ channel: "whatsapp" | "twitter" | "copy_link" | "email" | … }
```

Wire from `/invite` copy/share actions and future share buttons.

### 13.9 Outbox + gamification worker flow

```text
ReferralService.apply / qualifyReferral
        ↓
ReferralConversion + OutboxEvent (unified collection)
        ↓
Redis Stream
        ↓
Gamification Worker
        ├── Referral Processor   (fraud, state, UserStats increment)
        ├── Reward Processor     (RewardEngine.grant)
        ├── Achievement Processor
        ├── XP Processor
        ├── Quest Processor
        └── → Notification Service
```

**Do not** put wallet/XP logic in `applyReferralOnNewUser`. Attribution write only.

### 13.10 Fraud checks (Sprint 2)

| Signal | Action |
|--------|--------|
| Same device fingerprint on referrer + referee | Reject or hold |
| Same IP + browser + same day | Flag suspicious |
| Disposable / sequential emails | Flag |
| Self-referral | Blocked (live) |
| Referrer velocity | Rate-limit rewards, not signup |

Fraud blocks **rewards and verified status**, not account creation.

---

## 14. Comparison to achievements flow

| Dimension | Achievements (live) | Referrals (live) | Target (unified) |
|-----------|---------------------|------------------|------------------|
| Core service | `achievementEngine` | `referral.service` | Both |
| Outbox + worker | Achievement worker | Not yet | **Gamification Worker** (merge) |
| Stats model | `UserStats` | Not wired | `UserStats` + **`UserGamification`** split |
| Rewards | XP via engine | None | **`RewardGrant` ledger** |
| Events | Many | `referral.converted` | Full funnel + share |

Achievements worker becomes the **Gamification Worker** host; add referral/quest processors rather than a second deployment.

---

## 15. Sprint roadmap (implement next)

No further architecture documents. Execute in order:

### Sprint 1

```text
ReferralConversion collection
UserStats.referralsConverted
Dual-write from applyReferralOnNewUser; migrate GET /api/invites/referred
```

### Sprint 2

```text
ReferralFraudCheck (device, IP, velocity)
Pending / Verified state machine
Defer referral.converted until verified
```

### Sprint 3

```text
Unified OutboxEvent
Gamification Worker (extend achievement worker)
Event routing for referral + achievement processors
```

### Sprint 4

```text
RewardEngine.grant + RewardGrant collection
XP rewards for verified referrals
Referral achievement slugs (invite-1, invite-5, invite-10)
```

### Sprint 5

```text
referral:leaderboard + GET /api/invites/leaderboard
referral.share instrumentation
referral:user:{id}:stats Redis cache
Campaigns + seasonal referral events
```

---

## 16. Final verdict

The referral system is a **production-grade referral platform design**, not a one-off feature:

- **Live:** multi-channel attribution, resolver, caching, idempotent writes, signup UI, notifications, invite dashboard.
- **Signed off:** Mongo split (`UserStats` / `UserGamification`), `ReferralConversion`, `RewardGrant`, unified outbox, **one Gamification Worker**, full analytics funnel including **share** tracking.

**Stop adding architectural components.** Implement Sprints 1–5. At completion, Syntax can run referral campaigns, invite rewards, XP, achievements, quests, seasonal events, and leaderboards on a single gamification foundation.
