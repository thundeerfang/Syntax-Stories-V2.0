# Blog read streak

Public profile **reading streaks** only (there is **no** posting-based streak). Streaks are consecutive **UTC** days / ISO weeks / calendar months in which the user **read at least one published blog post that is not their own**.

---

## Shipped behavior (current)

### Data model

**Collection:** `BlogReadDay` (`blogreaddays`)

| Field | Type | Purpose |
|-------|------|---------|
| `readerId` | ObjectId → users | Profile owner / reader |
| `dayBucket` | string `YYYY-MM-DD` | UTC calendar date |
| `updatedAt` | Date | Last time this day was marked |

**Unique index:** `{ readerId: 1, dayBucket: 1 }`.

### Recording reads (sync path)

- **Tier-2 lifecycle (Redis required for session):**
  - `POST /api/blog/p/:username/:slug/read/start` — VIEW_START; returns `{ sessionId, minDwellMs }` (default **10s** dwell).
  - `POST /api/blog/p/:username/:slug/read/commit` — body `{ "sessionId" }`; **Mongo `BlogReadDay` upsert first**, then **F.1 merged Lua** (`readViewCommitMerged.lua`: session + streak HASH + `readDays` ZSET + ack + `DEL` session). Responses: `alreadyProcessed`, `dwell_too_short`, `invalid_session`, `STREAK_MONOTONICITY_BROKEN` / `STREAK_DAY_NON_MONOTONIC`, or `redisApplied: false` if Lua fails after Mongo (§32-style success).
- **Legacy / fallback:** `POST /api/blog/p/:username/:slug/read-day` — same Mongo upsert + optional `syncReadStreakRedisAfterMongoUpsert` when not using the session path. Webapp waits **min dwell**, then **read/start → read/commit**, or falls back to `read-day` if Redis is unavailable or commit fails.
- **Rules:** Post must exist, `status: published`, not soft-deleted. **Self-reads do not count** (`readerId === authorId` → `{ counted: false, reason: 'self' }`).
- **Effect:** Upsert one row for **today’s UTC** `dayBucket`. Multiple distinct posts the same day still map to **one** bucket row.
- **Redis (optional):** When `REDIS_URL` is configured, the server **best-effort** updates after the Mongo upsert (`readStreakRedis.ts`, `readStreakZset.ts`):
  - **`user:{readerId}:readDays`** sorted set — member = `dayBucket`, score = **UTC midnight epoch ms** ([F.4](#f4-zset-score-standard-and-trim-boundary)); **`ZADD NX`** on the warm path; **full ZSET rebuild from Mongo** when the daily HASH is cold or behind `max(dayBucket)`; **trim** with `ZREMRANGEBYSCORE -inf (<trimMinRetain` keeping a **~400-day** window.
  - **`user:{readerId}:streak:daily`** HASH — same as before: rebuild vs **`EVAL`** HASH-only Lua (Phase 3).
  **Profile streaks still come from Mongo** via `readStreak.service.ts`. Monotonicity violations are logged (`STREAK_MONOTONICITY_BROKEN`) and skip Redis writes.

**Client:** After loading a public post, signed-in non-authors run the **start → wait `minDwellMs` → commit** flow (or legacy `read-day` fallback).

### Streak math

**Service:** `server/src/services/readStreak.service.ts` (not `blogStreak`).

- **Daily / weekly / monthly** from UTC midnights derived from `BlogReadDay.dayBucket`.
- **Public API:** `GET /api/follow/profile/:username` returns **`readStreak`** (not `blogStreak`):

```json
{
  "readStreak": {
    "displayMode": "daily",
    "current": 3,
    "longest": 10,
    "totalDistinctReadDays": 42,
    "byMode": {
      "daily": { "current": 3, "longest": 10 },
      "weekly": { "current": 1, "longest": 4 },
      "monthly": { "current": 2, "longest": 6 }
    }
  }
}
```

- **`totalDistinctReadDays`:** count of distinct `dayBucket` rows for the reader.

### Profile preference (DB field name)

- MongoDB / user API still use **`blogStreakMode`** (`'daily' | 'weekly' | 'monthly'`) for the **display** choice only — it means “which read streak interval to highlight,” not posting.
- **PATCH** `/auth/profile/blog-streak` with `{ "blogStreakMode": "weekly" }` — only changes highlighted **`readStreak.displayMode`**; `byMode` always includes all three.

### Code map

| Area | Location |
|------|----------|
| Read streak math | `server/src/services/readStreak.service.ts` — **daily** uses `recomputeDailyStreakFromSortedDays` + today/yesterday anchor (**Phase 2**); weekly/monthly unchanged |
| Single Source Streak Engine (Phase 1 shipped) | `server/src/streak/applyDailyStreakTransition.ts`, `calendarUtc.ts`, `dailyStreakGoldenCases.ts`, `index.ts` ([§33](#33-single-source-streak-engine-shared-logic-layer)) |
| Redis HASH Lua (Phase 3 — golden parity) | `server/src/streak/lua/applyDailyStreakHash.lua`, `evalApplyDailyStreakHash.ts`; opt-in tests: `RUN_REDIS_TESTS=1` + `REDIS_URL` → `server/src/__tests__/streakLuaGolden.integration.test.ts` |
| Redis read-days ZSET + daily HASH (best-effort) | `readStreakRedis.ts`, `readStreakZset.ts` — keys `readStreak.readDaysZset` / `readStreak.dailyHash` in `shared/redis/keys.ts`; wired from `recordBlogReadDay` after Mongo upsert |
| VIEW_START / VIEW_COMMIT + F.1 Lua | `startBlogReadView` / `commitBlogReadView` in `blog.controller.ts`; `readViewCommitMerged.lua`, `readViewCommitRedis.ts`; routes `/p/:username/:slug/read/start` & `/read/commit` |
| Durable read streak longest (F.5) | `User.readStreakLongest` + `readStreakDurability.service.ts`; merged into public profile `readStreak` in `follow.controller.ts` |
| Redis-first **daily** profile (when HASH not stale vs Mongo `max(dayBucket)`) | `readStreakRedisDisplay.ts` — `computeReadStreakPayload(..., getRedis())` in `follow.controller.ts` |
| VIEW_START rate limit (F.2 sketch) | `readStreakRateLimit.ts` — `rl:read:start:{userId}:{minute}`; **30**/min/user |
| ZSET+HASH reconciliation (§31) | `reconcileReaderReadStreakRedis` in `readStreakRedis.ts`; **`npm run reconcile:read-streak-redis`** (`READ_STREAK_RECONCILE_MAX` optional) |
| In-process metrics (F.8 sketch) | `readStreakMetrics.ts` — counters for rate-limit hits, Lua failures, reconcile batch size |
| Golden TS tests | `server/src/__tests__/streakEngine.test.ts` |
| Public payload | `server/src/controllers/follow.controller.ts` (`readStreak`) |
| Record read day | `server/src/controllers/blog.controller.ts` → `BlogReadDayModel` |
| Model | `server/src/models/BlogReadDay.ts` |

---

## Roadmap: scale & product depth

The sections below are **not all implemented**. Use them to evolve toward a high-traffic system without overbuilding on day one. **Daily streak math** in Tier 2 **must** converge on **[§33 — Single Source Streak Engine](#33-single-source-streak-engine-shared-logic-layer)**. Before calling Redis/queue/session paths **production-ready**, work through **[Production readiness: bugs, risks, and checklist](#production-readiness-bugs-risks-and-checklist)**.

### 1. Async read pipeline (Redis + queue)

**Today:** Client → API → Mongo `updateOne` (sync). Under viral load this hammers Mongo.

**Target flow:**

```
Client → API → Redis (fast write + dedupe)
                ↓
            Queue (BullMQ)
                ↓
            Worker → MongoDB (upsert BlogReadDay)
```

**API (fast path) sketch:**

```ts
const day = streakUtcDayBucket(now);
await redis.sAdd(`read:posts:${userId}:${day}`, postId);
const enqueued = await redis.set(`read:enqueued:${userId}:${day}`, '1', 'EX', 86400, 'NX');
if (enqueued) {
  await readDayQueue.add('process-read-day', { userId, day }, { jobId: `read-day:${userId}:${day}` });
}
```

**Worker:**

```ts
await BlogReadDayModel.updateOne(
  { readerId: userId, dayBucket: day },
  { $set: { updatedAt: new Date() } },
  { upsert: true }
);
```

**Why:** Burst traffic hits Redis O(1) ops; Mongo writes are batched and idempotent; workers scale horizontally.

---

### 2. Redis as real-time streak index (optional)

Store occupied read days in a **sorted set** per user:

```
Key: user:{userId}:readDays
Score: UTC midnight ms for that day
Member: YYYY-MM-DD
```

**Benefits:** O(log N) range queries; fast “last 90 days” for heatmaps; can compute current streak in memory without full collection scan when N is bounded.

**Caveat:** Must stay consistent with Mongo (Mongo remains source of truth unless you commit to Redis-first with replay).

---

### 3. Pre-computed streak cache

Cache keys (stringified JSON or hash fields):

```
user:{userId}:streak:daily
user:{userId}:streak:weekly
user:{userId}:streak:monthly
```

Refresh in the **worker** whenever a new `dayBucket` is committed (or TTL + lazy recompute).

**Profile read path:** Redis → fallback `readStreak.service` + Mongo.

---

### 4. Anti-abuse / quality

Today: opening a post can count immediately.

**Add:**

- Prefer a **two-step** lifecycle: [§16](#16-two-step-read-lifecycle-view_start--view_commit) VIEW_START / VIEW_COMMIT (only **commit** enqueues streak).
- Minimum **dwell time** (e.g. 10–20s) before client may call record (or send a second “commit read” event).
- **Scroll depth** (client-reported, sanity-capped).
- **Page Visibility API** — ignore time when tab hidden.

**API response example:**

```json
{ "success": true, "counted": false, "reason": "low_engagement" }
```

---

### 5. Engagement-weighted streak (advanced)

Score per day: open +1, scroll 50% +2, completed +3. Store `qualityScore` on `BlogReadDay` (or separate rollup).

**Product:** “Strong streak” vs “light streak” badges — requires clear UX copy and versioning.

---

### 6. Gamification

- Badges: 7 / 30 / 100+ read days.
- Milestones and weekly insights (“You read 12 posts this week”) from `UserReadStats` (denormalized collection).

---

### 7. Streak freeze (UX)

Monthly **freeze** token: skip one missed UTC day without breaking the chain. Needs ledger + rules (no stacking abuse).

---

### 8. Multi-timezone (advanced)

Keep **UTC** as canonical `dayBucket` for integrity; optional **local display** layer using `user.timezone` (Luxon / `date-fns-tz`). Document anchor rules if you add local mode.

---

### 9. Analytics

**Collection sketch:** `UserReadStats` — `readerId`, `weekKey`, `postsRead`, `activeDays`, `updatedAt`.

**Use:** leaderboards (opt-in), retention, internal dashboards — not required for v1 streak display.

---

### 10. Batch flush (buffer)

Redis set `read:buffer:{utcDay}` of `{userId:postId}` strings; flush every **N seconds** or **M events** to reduce queue noise. Trade-off: slight latency before streak updates.

---

### 11. Schema extensions (Mongo)

Future `BlogReadDay` fields:

| Field | Purpose |
|-------|---------|
| `readCount` | Distinct posts read that UTC day (cap for perf) |
| `qualityScore` | Weighted engagement |
| `firstReadAt` / `lastReadAt` | Analytics |

---

### 12. Idempotency

Natural key: **`readerId` + `dayBucket`**. Reinforce at:

- Redis `SADD` / job id `read-day:{userId}:{day}`
- BullMQ `jobId` dedupe
- Mongo unique index (already shipped)

---

### 13. API additions

- **`GET /api/blog/read-streak/me`** (auth): calendar last 90 days, gaps, optional `readStreak` detail — without overloading public profile.
- **`GET /api/follow/profile/:username`** stays lean with `readStreak` summary.

New read APIs should use the **[§32 envelope](#32-api-response-envelope-read-streak-endpoints)** where practical.

---

### 14. Break prediction (advanced)

Heuristic from recent gaps + time-to-UTC-midnight: `streakRisk: 'low' | 'medium' | 'high'`. Owner-only or settings UX.

---

### 15. UI ideas

- GitHub-style **heatmap** (90d / 365d): **primary source = `user:{id}:readDays` ZSET** (hot); **fallback = Mongo** `BlogReadDay` query if Redis empty or suspect (see [Appendix D](#appendix-d--heatmap-ui-react-sketch)).
- Flame / lottie already used for streak stat.
- Weekly mini chart from `UserReadStats`.

---

## Tier 2: Senior system design & product differentiation

The following **extends** [Roadmap §1–15](#roadmap-scale--product-depth) with event lifecycle, **Redis as cache/accelerator** (never canonical alone), O(1) **daily** streak maintenance, anti-cheat, and social/insights—without replacing the shipped UTC bucket model.

### 16. Two-step read lifecycle (VIEW_START / VIEW_COMMIT)

**Shipped:** single `POST …/read-day` ≈ “open post → count.” That is fine for v1 but **naive** for anti-abuse and quality scoring.

**Upgrade:**

| Step | Endpoint (sketch) | Effect |
|------|-------------------|--------|
| **1. VIEW_START** | `POST /api/blog/read/start` | Registers intent + session id; **does not** enqueue streak or increment counters. |
| **2. VIEW_COMMIT** | `POST /api/blog/read/commit` | After engagement threshold (dwell, scroll, visibility); **only this** enqueues / updates streak. |

**Flow:**

```
VIEW_START (page open)
       ↓
  (client measures engagement)
       ↓
VIEW_COMMIT (threshold met) → Redis + optional queue → streak
```

**Why:** blocks fake inflation from tab opens; unlocks weighted “quality” later without changing UTC `dayBucket` semantics for the **basic** streak type.

**Session validation (do not trust bare `sessionId`):**

- On **VIEW_START**, write **`read:session:{sessionId}`** (HASH or JSON string) with `{ userId, postId, startTime, used: '0' }` (string fields in Redis HASH), **TTL ~30 min**.
- On **VIEW_COMMIT**, run **one** atomic **[Appendix F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)** script: validate session + update streak/ZSET + set short-lived **ack** key + **`DEL` session** (memory + replay hygiene). Transport retries: if session is gone, **`GET` ack** → return **`alreadyProcessed: true`** ([§32](#32-api-response-envelope-read-streak-endpoints)).
- Reject reused or forged ids → `{ success: false, reason: 'invalid_session' }`.

---

### 17. Mongo = source of truth; Redis = performance layer

**Do not** treat Redis as the canonical store of streak history. Eviction, restart, misconfiguration, or failover can **wipe Redis**; users would see broken streaks with no durable audit trail.

| Layer | Role |
|-------|------|
| **MongoDB** | **Source of truth:** `BlogReadDay` rows, extended fields, analytics. All streak **authority** reconciles here. |
| **Redis** | **Accelerator:** dedupe keys, `readDays` ZSET (hot window), **`user:{id}:streak:daily` HASH** (and separate keys for weekly/monthly if cached), sessions, queues. |

**Profile hot path:** read from Redis when present; **on miss or doubt**, recompute or load from **Mongo** (and optionally repopulate Redis).

**Worker:** always **upsert Mongo** for a committed day, then **heal Redis** if the API never ran merged Lua ([§30](#30-real-time-ux-instant-flame)); Redis updates are **best-effort fast path**, not a substitute for persistence.

**Redis-first reads** are an optimization, not a redefinition of truth.

---

### 18. O(1) rolling streak — daily only, with edge cases

Maintain **`user:{userId}:streak:daily`** (HASH) for **basic daily** streak hot reads. Use **calendar UTC `dayBucket` strings** compared lexicographically or as dates (they are `YYYY-MM-DD`).

**Fields (example):** `current`, `longest`, `lastDay`, `lastUpdated`.

**Canonical definition:** the **only** allowed daily transition is **[§33 — Single Source Streak Engine](#33-single-source-streak-engine-shared-logic-layer)**. §18 pseudocode below matches it; **do not** maintain a divergent copy in Lua, workers, or jobs.

**Correct daily update (first commit of a new UTC day only):**

```txt
if (today === lastDay) return   // duplicate same-day commit: no increment, no reset

if (lastDay is empty) {
  current = 1
} else if (today === consecutiveCalendarDayAfter(lastDay)) {
  current += 1
} else if (today > consecutiveCalendarDayAfter(lastDay)) {
  // gap: streak broke (or recovery product rules apply separately)
  current = 1
}

longest = max(longest, current)
lastDay = today
```

**Race (two tabs, same instant):** two requests can both observe `lastDay !== today` before either writes. **Requirement:** **`EVAL` the merged commit script** ([Appendix F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)) so **at most one** streak transition per `(userId, dayBucket)` per session lifecycle; Redis serializes concurrent `EVAL`s on the shard.

**Edge cases this covers:**

| Case | Behavior |
|------|----------|
| **Duplicate same-day commit** | `today === lastDay` → **no-op** (no double increment). |
| **UTC boundary** | Reads at 23:59 UTC and 00:01 UTC are **two different `dayBucket`s** → two days can both count; streak continues if consecutive UTC days each have a commit. |
| **Freeze / recovery** | **Document priority explicitly** (product choice): e.g. **freeze supersedes** gap reset for that day, **then** recovery rules apply only when freeze did not apply — or the inverse. Ambiguity here causes double-count or wrong resets. |

> Pseudocode `consecutiveCalendarDayAfter(lastDay)` = next UTC calendar date string after `lastDay`.

**Weekly / monthly — not the same O(1) linear recurrence:**

- A week is **not** a simple “+1” on a counter (multiple reads in the same ISO week still occupy **one** bucket; gaps *within* the week do not create extra buckets).
- **Do not** drive weekly/monthly public numbers from the same rolling HASH logic as daily unless you prove equivalence.

**Fix:**

- **Daily:** O(1) HASH as above (optional).
- **Weekly / monthly:** compute from **bounded `user:{id}:readDays` ZSET** (e.g. last ~400 days) with the **same** rules as `readStreak.service.ts`, **or** store **precomputed** `streak:weekly` / `streak:monthly` in Redis updated by the worker whenever Mongo upsert completes.

**Result:** fast **daily** UX; **correct** multi-granularity stats.

> **Note:** `longest` / anchors for weekly & monthly must match `readStreak.service.ts` or be explicitly documented as a different product.

---

### 19. Time-bounded hot window in Redis

**Problem:** unbounded ZSET / keys per user grow forever and complicate memory.

**Rule:** keep only the **last ~400 UTC days** of `readDays` in Redis (or 366–400 for leap padding). **Mongo** holds the **full archive** for audits, backfill, and cold recompute.

**Eviction:** trim ZSET by score when inserting; or periodic job `ZREMRANGEBYSCORE` below cutoff.

---

### 20. Three-layer idempotency (distributed-safe)

Beyond Mongo’s unique index `{ readerId, dayBucket }`:

1. **Redis:** `SET read:dedupe:{userId}:{day} 1 NX EX <ttl>` (or commit-specific key including `postId` if you allow multiple commits per day with caps—see §21).
2. **Queue:** `jobId = read-day:{userId}:{day}` (BullMQ dedupe).
3. **Mongo:** unique index (already shipped).

**Prevents:** double-clicks, client retries, concurrent tab races.

---

### 21. Advanced anti-cheat (beyond dwell time)

Layer on **server-enforced** limits (configurable):

| Rule | Example |
|------|---------|
| **Per-day post cap** | Max **20** distinct posts count toward streak/quality per UTC day. |
| **Same-author cap** | Max **5** posts from the **same** `authorId` per UTC day (reduces single-author spam). |
| **Rapid-fire** | If **≥5** commits in **&lt;10s** → ignore or rate-limit (bot-like). |

Return structured reasons: `{ counted: false, reason: 'daily_post_cap' }`, etc.

**Client metrics are hints, not proof:** `activeMs` and `maxScrollRatio` can be spoofed. **Enforce on server:**

- **Minimum wall time** between VIEW_START and VIEW_COMMIT (from `read:session` `startTime`), independent of client-reported ms.
- **Rate limits** per user and per IP (and per session) on start/commit.
- Use client fields only as **secondary** signals (e.g. cap absurd values).

---

### 22. Reading depth dimension (schema upgrade)

Extend day rollup (Redis HASH and/or Mongo `BlogReadDay`) toward:

| Field | Purpose |
|-------|---------|
| `readCount` | Distinct qualifying posts that day |
| `uniqueAuthorsRead` | Distinct authors |
| `avgScrollDepth` | Client-reported, capped sanity bounds |
| `totalReadTimeMs` | Active visibility time |

**Unlocks:** recommendations, premium analytics, **streak types** (§23).

---

### 23. Streak types (product differentiator)

Same underlying events → **multiple** streak definitions (all UTC buckets, but different **qualify** rules per day):

| Type | Rule (per UTC day) |
|------|---------------------|
| **Basic** | ≥1 qualifying post read (committed) |
| **Deep reader** | ≥3 posts |
| **Explorer** | ≥3 **distinct** authors |
| **Pro** | ≥5 posts **and** ≥2 authors |

**Implementation:** either separate Redis HASH keys per type (`user:{id}:streak:basic`, …) or one doc with sub-objects.

**Product rule (avoid user confusion):**

- **Primary streak** = **Basic** (default): what can “break,” what the main flame number reflects, and what notifications reference.
- **Deep reader / Explorer / Pro** = **optional badges** or secondary stats — never ambiguous “which streak am I losing?” without explicit UI.

**Public profile** shows one primary metric + optional badge row for advanced types.

---

### 24. Social layer (retention)

- **Badge** on profile: “12-day read streak” (sync from Redis).
- **Feed / activity** line: “X is on a 30-day streak” (privacy toggle).
- **Leaderboard** (opt-in only; GDPR-friendly).

---

### 25. Smart notifications

Use **Redis + scheduler** (or delayed BullMQ job):

- Key or job expiring at **UTC midnight − 1h** for users at risk.
- Copy: “Your streak may break in about an hour.”

Respect notification prefs and quiet hours.

---

### 26. Break recovery (alternative / complement to freeze)

Instead of only a passive **freeze** token:

- **Recovery window:** e.g. within **24h** after a miss, read **3** qualifying posts → restore previous streak length (product-defined).

More engaging than freeze-only; requires explicit rules to avoid abuse (tie to §21 caps).

**Hard rule (no ambiguity):** if a **freeze** was **applied** for a given UTC **miss day**, **recovery must not apply** to “fix” that same miss — encode as mutually exclusive for that calendar event so product logic cannot double-save or contradict O(1) state.

---

### 27. Streak insights API

**Endpoint sketch:** `GET /api/blog/read-streak/insights` (auth, owner).

**Example payload:**

```json
{
  "bestDay": "Monday",
  "avgReadsPerDay": 2.3,
  "favoriteCategory": "Tech",
  "streakTrend": "increasing"
}
```

**Source:** `UserReadStats` + taxonomy on posts; cache in Redis with short TTL.

---

### 28. Queue batching

Beyond one job per user per day, add **`process-read-day-batch`**:

```json
{ "items": [{ "userId": "...", "day": "2026-05-05" }, ...] }
```

**Why:** lower worker overhead; amortize Mongo connection / bulk `bulkWrite`.

**Worker must:**

1. **Dedupe** batch items by `(userId, day)` before processing (order undefined).
2. Use **`bulkWrite`** with **`updateOne` + upsert** per key; partial batch failure should retry idempotently.
3. Treat duplicates in the batch as a single logical write.

---

### 29. Replay & rebuild (production safety)

**Today:** no automatic backfill; bugs or Redis loss need a path to **rebuild**.

**Add one of:**

- **Append-only event log** (Redis stream, compacted file, or Mongo capped collection) of `VIEW_COMMIT` facts; or
- **Kafka-lite** only when multiple consumers justify it.

**Use:** replay to rebuild `BlogReadDay` + Redis `user:{id}:streak:daily` (and ZSET) from a known checkpoint.

---

### 30. Real-time UX (instant flame)

**Problem:** if streak only updates after async worker, UI feels laggy.

**Fix:** on **VIEW_COMMIT**, after **durable intent** (see ordering below), run **merged Lua** ([Appendix F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)) for instant streak + ZSET. Worker **persists Mongo** and can reconcile `longest` / cross-mode later.

**Persistence vs Redis ordering (must-fix):** do **not** update hot-path Redis and then crash **before** enqueue/sync Mongo — you can leave **Redis ahead of Mongo** with no job. **Safe sequence:**

1. **`readDayQueue.add`** (or **`BlogReadDay` upsert** if enqueue fails — idempotent) **first**, so a durable path exists.
2. **Then** run **merged Lua** (streak + ZSET + session teardown).

Alternative equivalent: **sync Mongo upsert first**, then Lua (stronger durability, slightly higher API latency). Never **only** Redis with neither queued job nor Mongo write completed.

**Remaining race (must close):** **`readDayQueue.add` succeeds** → process **crashes before merged Lua** → Mongo still gets the row when the worker runs, but **Redis streak/ZSET never ran** → user sees **no flame** until reconciliation. **Fix:** the **worker**, after a successful **`BlogReadDay` upsert**, must **repair the hot path** — **always attempt** Redis heal; if heal **throws**, **fail the job** so BullMQ retries, and let **reconciliation** backstop ([§31](#31-failure-modes--reconciliation)).

**Worker heal must be idempotent (critical):** duplicate jobs / retries must **not** double-apply streak math. Use **`ZADD ... NX`** (Redis 6.2+) for `user:{id}:readDays`: **if the member already exists**, **skip** streak HASH updates (API Lua or a prior worker already applied that day). **If `NX` adds the member**, run the **same** streak transition as merged Lua (shared script/helper). Never blindly re-run full streak logic on every job execution. See [Appendix A](#appendix-a--bullmq-worker-sketch).

User may see streak in Redis **before** Mongo reflects the row — **Mongo remains SoT**; reconciliation (§31) repairs drift.

---

### 31. Failure modes & reconciliation

| Failure | Risk | Mitigation |
|---------|------|------------|
| **Queue down / job lost** | Mongo never updated | **Retries + DLQ**; **reconciliation**; prefer **enqueue (or Mongo) before Redis Lua** ([§30](#30-real-time-ux-instant-flame)); if enqueue fails, **sync Mongo `upsert`** before hot Redis |
| **Worker crash** after Redis update | Redis ahead of Mongo | **Cron reconciliation** |
| **Redis lost** | Fast path empty | Read path **falls back to Mongo** + optional O(B) recompute |
| **API crash after enqueue, before Lua** | Mongo row exists; Redis missing that day / stale HASH | **Worker heals Redis** after upsert ([§30](#30-real-time-ux-instant-flame)); cron reconciliation as backstop |
| **Worker: Mongo OK, Redis heal fails** | Drift until repaired | **Throw** to retry job; optional **`redis-heal-dlq`** / reconciliation sweep ([§30](#30-real-time-ux-instant-flame)) |

**Reconciliation job (mandatory for production — not optional polish):**

**Authoritative rule (no ambiguity):** for **which calendar days are officially “read,”** **`BlogReadDay` in Mongo always wins.** On conflict, **rebuild Redis** **atomically as a pair**: **`readDays` ZSET and `streak:daily` HASH together** — **never** refresh only the ZSET and leave a stale HASH (or vice versa). Recompute **`current` / `lastDay` / `longest`** (and trim ZSET) from **Mongo `BlogReadDay` rows** (or from Mongo + `User.readStreakLongest` for `longest` — [F.5](#f5-longest-streak-durability)).

**Internal drift (ZSET vs HASH):** if **`lastDay` in HASH** ≠ **max occupied day implied by ZSET** (or member set disagrees with HASH), treat as **partial failure** / version skew: **rebuild HASH from Mongo** (preferred) or, if Mongo rows match ZSET, **recompute HASH from the ZSET window** — do not leave mismatched structures.

- **Daily (minimum):** for active users or a sampled set, detect **mismatch** between Redis (`readDays` ZSET + `streak:daily` HASH) and **`BlogReadDay`** in Mongo; **overwrite both** Redis structures from Mongo when drift > 0.
- **Event log** (if you have one) may **insert missing Mongo rows** when Redis or the log proves a fact Mongo lacks — after insert, **still** treat **Mongo as SoT** for the merged result.
- **Rebuild** `user:{id}:streak:*` HASH **and** ZSET together after repair; HASH **`current` / `lastDay` / `longest`** from **`recomputeDailyStreakFromSortedDays`** on Mongo’s distinct `dayBucket` list ([§33](#33-single-source-streak-engine-shared-logic-layer)).

**UX note:** instant Redis streak is fine only if this job exists; otherwise users can see **wrong** numbers after Redis reset or worker loss.

---

### 32. API response envelope (read-streak endpoints)

Standardize new endpoints (`/read/start`, `/read/commit`, `/read-streak/insights`, etc.) on one shape:

```json
{
  "success": true,
  "data": {
    "counted": true,
    "alreadyProcessed": false,
    "dayBucket": "2026-05-05",
    "readStreak": { "current": 6, "longest": 20 }
  },
  "meta": {
    "requestId": "…",
    "stale": false
  }
}
```

**Idempotent VIEW_COMMIT (transport retries):** if the client retries after a successful commit, respond **`success: true`** with **`alreadyProcessed: true`** and the same **`dayBucket` / `readStreak`** shape (from Redis or Mongo).

1. Look up **`read:view_commit_ack:{userId}:{sessionId}`** when the session hash is gone.
2. **Ack TTL (mobile-safe):** use **1800–3600s** (30–60 min) so **background reconnect** / delayed retries still resolve — stricter than “a few minutes” ([Appendix F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)).
3. **Mongo fallback:** if **both** session and ack are missing but **`BlogReadDay`** already has **`(readerId, dayBucket === today)`**, treat as **`alreadyProcessed: true`** (idempotent UX — do **not** return **`INVALID_SESSION`** for a day Mongo already recorded).

Do **not** return a hard error for benign duplicates.

Errors: `{ "success": false, "error": { "code": "INVALID_SESSION", "message": "…" } }` (exact schema is team convention; consistency matters more than the label).

**Existing** `GET /api/follow/profile/:username` may stay as-is for backward compatibility; new routes should adopt the envelope.

---

### 33. Single Source Streak Engine (shared logic layer)

> **All basic daily streak transitions MUST use a single shared logic definition. Independent re-implementations across Redis Lua, worker heal, and reconciliation are not allowed** — they will drift. **Freeze / recovery / streak-type** rules apply **around** this core (preconditions or post-adjustments), but the **core step** “given `lastDay`, `current`, `longest`, and a new qualifying `today`, what is the next state?” is **one** function.

**Problem without this:** correct-but-separated Lua, TypeScript worker, and reconciliation codebases **diverge** after a few months of edits → **silent inconsistency** (wrong `current` / `longest` for some paths only).

**Mandatory module (TypeScript — canonical):** `server/src/streak/applyDailyStreakTransition.ts`. **Shipped:** `readStreak.service.ts` **`computeDailyStreak`** calls **`recomputeDailyStreakFromSortedDays`** (Phase 2) plus the profile **today / yesterday** anchor; weekly/monthly stay in the service until separately unified.

**Core transition** (`yesterday` = UTC calendar day **immediately before** `today`; same as [F.0](#f0-time-arguments--single-server-source-mandatory)):

```ts
export function applyDailyStreakTransition(input: {
  lastDay: string | null | undefined;
  current: number;
  longest: number;
  today: string;
  yesterday: string;
}): { current: number; longest: number; lastDay: string; applied: boolean } {
  const { lastDay, current: cur0, longest: lng0, today, yesterday } = input;
  let current = cur0;
  let longest = lng0;

  if (lastDay === today) {
    return { current, longest, lastDay: today, applied: false };
  }
  if (!lastDay) {
    current = 1;
  } else if (lastDay === yesterday) {
    current = current + 1;
  } else {
    current = 1;
  }
  longest = Math.max(longest, current);
  return { current, longest, lastDay: today, applied: true };
}
```

**Full recompute from history** (reconciliation, cold start): sort **unique** `dayBucket` strings ascending; fold with the **same** function — each step passes **`yesterday = previousUtcCalendarDay(today)`**:

```ts
export function recomputeDailyStreakFromSortedDays(
  sortedUniqueDayBuckets: string[]
): { current: number; longest: number; lastDay: string } {
  let lastDay = '';
  let current = 0;
  let longest = 0;
  for (const today of sortedUniqueDayBuckets) {
    const yesterday = previousUtcCalendarDay(today);
    ({ current, longest, lastDay } = applyDailyStreakTransition({
      lastDay: lastDay || undefined,
      current,
      longest,
      today,
      yesterday,
    }));
  }
  return { current, longest, lastDay };
}
```

**Where it must run:**

| Consumer | Requirement |
|----------|-------------|
| **Redis Lua** ([F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)) | **Line-for-line equivalent** to `applyDailyStreakTransition` for the HASH fields (ZADD/trim/session are separate). **CI:** **[Golden Test Contract](#33-single-source-streak-engine-shared-logic-layer)** — mandatory. |
| **Worker heal** ([§30](#30-real-time-ux-instant-flame), [Appendix A](#appendix-a--bullmq-worker-sketch)) | After **`ZADD NX`** adds the day, **read** HASH, **`applyDailyStreakTransition` only** — **no** inline conditionals. **Lint/review** enforced ([§33](#33-single-source-streak-engine-shared-logic-layer)). |
| **Reconciliation** ([§31](#31-failure-modes--reconciliation)) | Rebuild HASH (and validate ZSET) via **`recomputeDailyStreakFromSortedDays(MongoDistinctDayBuckets)`** (or equivalent single reducer), **not** a third bespoke loop. |
| **Controllers / utils / jobs (any)** | **Forbidden:** hand-rolled `if (lastDay === yesterday) current++` (or equivalent). **Only** `applyDailyStreakTransition` / `recomputeDailyStreakFromSortedDays` or the **Lua** port for the hot atomic path. |

**Freeze / recovery / types:** encode as **inputs** (whether `today` “counts” as a gap) or **post-pass** adjustments **documented** next to §18 — still **must not** fork the core `if (lastDay === today) …` logic.

> **Final lock:** Any deviation from the shared streak transition logic is considered a **data integrity bug**. All implementations (Lua, worker, reconciliation) must be **provably equivalent** via **automated tests** (see **Golden Test Contract** under this section).

#### Golden Test Contract (mandatory)

**Lock TypeScript and Lua together.** One shared vector list drives **both** `applyDailyStreakTransition` (TS) and the merged **VIEW_COMMIT** HASH transition (Lua `EVAL`), with **strict equality** on outputs.

**Shared cases** (import from e.g. `server/src/streak/__fixtures__/dailyStreakGoldenCases.ts`):

```ts
export const dailyStreakGoldenCases = [
  { lastDay: null, current: 0, longest: 0, today: '2026-05-05', yesterday: '2026-05-04' },
  { lastDay: '2026-05-04', current: 3, longest: 5, today: '2026-05-05', yesterday: '2026-05-04' },
  { lastDay: '2026-05-01', current: 3, longest: 5, today: '2026-05-05', yesterday: '2026-05-04' },
  { lastDay: '2026-05-05', current: 3, longest: 5, today: '2026-05-05', yesterday: '2026-05-04' },
] as const;
```

**Expected outputs** (TS reference — CI must assert Lua returns the same `current`, `longest`, `lastDay`, `applied` for the HASH step):

| # | `current` | `longest` | `lastDay` | `applied` |
|---|-----------|------------|-----------|-----------|
| 1 | `1` | `1` | `2026-05-05` | `true` |
| 2 | `4` | `5` | `2026-05-05` | `true` |
| 3 | `1` | `5` | `2026-05-05` | `true` |
| 4 | `3` | `5` | `2026-05-05` | `false` |

**Test rule (CI):** for each case, run **`applyDailyStreakTransition(...)`** and run the **Lua** HASH-only subroutine (or full script with session/ZSET stubbed) via **`EVAL`**; **`assert.deepStrictEqual`** TS vs Redis results. **Expand** this table whenever you change freeze/recovery or edge rules.

#### API runtime guard (fail-fast, mandatory)

**Before** `EVAL`, the API **must** read `lastDay` from Redis (or pass through from a prior `HGET`) and:

```ts
if (lastDayFromRedis && today < lastDayFromRedis) {
  throw new Error('STREAK_MONOTONICITY_BROKEN');
}
```

Map to your HTTP layer as a **500 / data-integrity** class error; **never** silently continue. This **duplicates** the intent of Lua **`-3`** ([F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)) — **both** layers are required: API fails fast; Lua is last line of defense inside Redis.

#### Worker & codebase policy (enforce in review / lint)

- **Not allowed** in worker, reconciliation, controllers, or utils:

```ts
// ❌ FORBIDDEN — any independent streak transition
if (lastDay === yesterday) current++;
```

- **Only allowed:**

```ts
// ✅ REQUIRED
applyDailyStreakTransition({ lastDay, current, longest, today, yesterday });
```

**Enforcement:** treat as **code review checklist** + optional **ESLint** `no-restricted-syntax` / custom rule grep for streak-shaped conditionals outside `server/src/streak/*` and the Lua file.

#### Valid implementations (exactly two)

1. **TypeScript:** `applyDailyStreakTransition` + `recomputeDailyStreakFromSortedDays` in the **streak module**.
2. **Lua:** merged VIEW_COMMIT script — **HASH transition block only** must mirror TS **line-for-line** in behavior, verified by **Golden Test Contract**.

**Remove** any other duplicate streak transition logic discovered in worker, reconciliation, controller, or utils — **delete** or **replace** with calls to the engine.

---

## Refined target architecture (Tier 2)

```
Client
  ↓
API
  ├─ Validate session (VIEW_START / COMMIT, Redis-backed)
  ├─ Anti-abuse (caps, rapid-fire, server clock gap, Redis INCR limits + app)
  ├─ Durable intent FIRST: Queue add (or sync Mongo upsert fallback)
  ├─ Redis (merged VIEW_COMMIT Lua):
  │     - read:session → streak HASH + readDays ZSET + read:ack:{userId}:{sessionId} + DEL session
  └─ (optional batch / deduped jobs)
        ↓
     Worker
        ├─ Mongo upsert (source of truth for BlogReadDay) + $setOnInsert / $set split ([Appendix A](#appendix-a--bullmq-worker-sketch))
        ├─ Heal Redis: **ZADD NX** + **`applyDailyStreakTransition`** ([§30](#30-real-time-ux-instant-flame), [§33](#33-single-source-streak-engine-shared-logic-layer))
        ├─ Analytics / UserReadStats; optional User.readStreakLongest bump ([F.5](#f5-longest-streak-durability))
        └─ Reconciliation: Mongo → rebuild Redis; repair jobs
```

---

## Invariants — do **not** break

These stay true across Tier 1 and Tier 2:

- **UTC `dayBucket`** (`YYYY-MM-DD`) as canonical calendar bucket for the **basic** streak unless you add a separate **local-display** layer with explicit spec.
- **MongoDB** is the **source of truth** for persisted read days; **Redis** accelerates reads and must be **recoverable** from Mongo (plus optional event log).
- **Mongo unique index** `{ readerId: 1, dayBucket: 1 }` for durable day rows.
- **One row per reader per UTC day** for the **basic** “day counted” fact (enriched fields may still live on that row).

**Locked Tier 2 rules (do not regress):** UTC bucket invariant · Mongo = SoT for persisted days · one day = one `BlogReadDay` row · **[§33](#33-single-source-streak-engine-shared-logic-layer) Single Source Streak Engine** + **Golden Test Contract** (TS ≡ Lua CI) · **API `STREAK_MONOTONICITY_BROKEN`** before `EVAL` · **no duplicate** transition logic outside streak module + Lua · **merged atomic** VIEW_COMMIT Lua · **Queue + DLQ + retry** · **durable intent before hot Redis** on the API path · **worker heals Redis** (**idempotent** `ZADD NX` + **`applyDailyStreakTransition` only**) after Mongo upsert · **reconciliation** rebuilds **ZSET + HASH together** via **`recomputeDailyStreakFromSortedDays`** · **readStreakLongest** (or equivalent) for durable `longest`.

---

## What not to overbuild early

- **Kafka** before you have clear multi-consumer scale.
- **ML** for streak prediction.
- **Multi-region** Redis replication as a blocker.

**Practical first step:** **Redis + BullMQ + Mongo worker**, keep current sync path as fallback when Redis is disabled.

---

## Recommended target architecture (Tier 1)

Minimal evolution from shipped code:

```
Client → API → Redis (dedupe + optional ZSET) → Queue (BullMQ) → Worker → MongoDB
```

For **API-side instant streak + Redis-accelerated reads** (Mongo still authoritative), use the **[Refined target architecture (Tier 2)](#refined-target-architecture-tier-2)** diagram above.

---

## Appendix A — BullMQ worker (sketch)

Handler only. **Retries, DLQ, producer fallback, and Redis Lua** → **[Appendix F](#appendix-f--production-redis-lua--bullmq-retries--dlq)**.

```ts
// workers/readDayWorker.ts
import { Worker } from 'bullmq';
import { connection } from '../redis.js';
import { BlogReadDayModel } from '../models/BlogReadDay.js';
import mongoose from 'mongoose';

export const readDayWorker = new Worker(
  'read-day',
  async (job) => {
    const { userId, day } = job.data as { userId: string; day: string };
    const readerId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    await BlogReadDayModel.updateOne(
      { readerId, dayBucket: day },
      {
        $set: { updatedAt: now },
        $setOnInsert: { readerId, dayBucket: day },
      },
      { upsert: true }
    );
    // After Mongo success: heal Redis — ZADD NX; if new member, read HASH → applyDailyStreakTransition → HSET ([§33]).
    // await healReadStreakRedisIdempotent({ userId, dayBucket: day }); // must import shared engine
    // Optionally: if new current > User.readStreakLongest → $max ([F.5])
  },
  { connection, concurrency: 20 }
);
```

When `BlogReadDay` gains **immutable** insert-only fields (e.g. first-seen timestamp), put them in **`$setOnInsert` only**; put **mutable** analytics in **`$set`** so later jobs do not overwrite invariants.

---

## Appendix B — Redis key conventions

| Key | Type | Purpose |
|-----|------|---------|
| `read:posts:{userId}:{day}` | SET | Post ids touched (optional dedupe / analytics) |
| `read:dedupe:{userId}:{day}` | STRING | `SETNX` + TTL — idempotency layer (§20) |
| `read:session:{sessionId}` | HASH | `userId`, `postId`, `startTime`, `used`; TTL ~30m; **`DEL` on successful commit** ([Appendix F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)) |
| `read:view_commit_ack:{userId}:{sessionId}` | STRING | **User-scoped** ack; TTL **30–60 min** typical (mobile reconnect) + **§32** Mongo fallback ([F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)) |
| `read:enqueued:{userId}:{day}` | STRING NX+EX | One queue job per user per day |
| `user:{userId}:readDays` | ZSET | score=utcMidnightMs, member=`YYYY-MM-DD` (trim to ~400 days, §19) |
| `user:{userId}:streak:daily` | HASH | Daily basic streak O(1) (§18); **not** canonical vs Mongo; update atomically (Lua) under concurrency |
| `user:{userId}:streak:deep` | HASH | Optional second streak type (§23) |

Use a **key prefix** per environment (`staging:` / `prod:`).

---

## Appendix C — Streak algorithm: O(B) recompute vs O(1) rolling

**Recompute path (shipped / cold fallback):** **B** = distinct occupied day buckets. Sort unique **`YYYY-MM-DD`** ascending. **Daily basic:** **`recomputeDailyStreakFromSortedDays`** ([§33](#33-single-source-streak-engine-shared-logic-layer)) — used by **`computeDailyStreak`** (with anchor) and by Tier 2 reconciliation/worker. Weekly uses ISO Monday UTC; monthly uses UTC month index. Input can be Mongo cursor or a bounded Redis ZSET range.

**Hot path (Tier 2, §18):** maintain **`user:{id}:streak:daily` HASH** on each **first** commit of a new UTC day so profile reads avoid sorting full history. Periodically **reconcile** with O(B) job from Mongo or ZSET if you suspect drift.

---

## Appendix D — Heatmap UI (React sketch)

**Data source:**

1. **Hot:** `ZRANGE user:{id}:readDays <start> <end> BYSCORE` (or paginated) → set of `YYYY-MM-DD`.
2. **Fallback:** Mongo `BlogReadDay.find({ readerId }).select('dayBucket')` when Redis miss, eviction, or post-incident rebuild.

**Contract:** same UTC strings either way. **On mismatch:** **Mongo wins** for which days are officially recorded; **refresh / overwrite Redis** from Mongo (or from log-replayed Mongo). Do not let ZSET and Mongo diverge silently.

**Cold Redis / stampede:** avoid fan-out **Mongo full scans** for every user at once. **Lazy warm** on profile/heatmap read (per-user rebuild with rate limit) plus a **background** reconciler that gradually repopulates ZSET/HASH from Mongo.

**UI:**

1. **Owner API** returns `days: string[]` (last 365 `YYYY-MM-DD` UTC) or a dense bitset assembled server-side from the above.
2. **Grid:** 7 columns (weekday), ~53 rows or a single row scroll of weeks.
3. **Cell:** `bg-primary/20` if `day ∈ set`, else `bg-muted`.
4. **Tooltip:** date + optional `readCount` when schema extends.

Use CSS `grid` with `gap-1`, `aspect-square` cells, `title` or Radix tooltip for accessibility.

---

## Appendix E — VIEW_START / VIEW_COMMIT payload sketch

```ts
// POST /api/blog/read/start
{ "postId": "...", "sessionId": "uuid" }
// → server sets read:session:{sessionId} = { userId, postId, startTime, used: '0' } EX 1800 (strings; merged commit Lua in Appendix F.1)

// POST /api/blog/read/commit
{
  "postId": "...",
  "sessionId": "uuid",
  "activeMs": 18500,
  "maxScrollRatio": 0.42,
  "tabVisible": true
}
```

Server validates **Redis session** (existence, TTL, matching `userId`/`postId`, **single-use `used` flag**), **server-side elapsed time** since `startTime`, rate limits, and caps (§21) before touching streak HASH or enqueue. Client timing fields are **hints** only (§21); reject absurd values (e.g. `activeMs` ≫ elapsed wall time).

---

## Appendix F — Production Redis Lua & BullMQ (retries + DLQ)

**Key prefix:** replace `PREFIX` at runtime (e.g. `prod:`) on all keys below.

### F.0 Time arguments — single server source (mandatory)

**Do not** pass `today` / `yesterday` from the client. Compute both in the **API** from the **same** server clock / same `dayBucket` helper in one call path. Wrong `yesterday` (tz drift, double computation) **breaks** streak math in Lua.

**Mandatory before `EVAL` (fail fast):**

- `assert(isValidUtcDayBucket(today))` and same for `yesterday` (`YYYY-MM-DD`, real calendar date).
- `assert(today === nextUtcCalendarDay(yesterday))` — single helper chain so a bug cannot silently desync the pair.
- **Monotonicity vs Redis (clock / deploy bugs):** load **`lastDayFromRedis`** from **`user:{id}:streak:daily`** (`HGET`) **before** `EVAL`. If set and **`today < lastDayFromRedis`** lexicographically, **`throw new Error('STREAK_MONOTONICITY_BROKEN')`** (or domain equivalent) — **no** `EVAL` — log + metric ([§33](#33-single-source-streak-engine-shared-logic-layer)). Lua **`-3`** is still required as an in-script guard ([F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)).

Lua still only sees strings; calendar **pair** validation is on the API — **monotonicity** is **API + Lua** double-guarded.

### F.1 Merged VIEW_COMMIT Lua (session + streak + ZSET + ack + DEL session)

**One `EVAL`** so you never consume a session without applying streak (or get streak without a validated session). Matches [§30](#30-real-time-ux-instant-flame) ordering: run **after** enqueue / Mongo fallback.

**`KEYS`:**

1. `read:session:{sessionId}` (HASH)
2. `user:{userId}:streak:daily` (HASH)
3. `user:{userId}:readDays` (ZSET)
4. `read:view_commit_ack:{userId}:{sessionId}` (STRING — **always include `userId`** in the key so reused/mis-issued `sessionId` cannot cross users)

**`ARGV`:** `[ today, yesterday, zsetScoreMs, trimMinScoreStr, lastUpdatedMs, userId, postId, ackTtlSeconds ]`

- **`zsetScoreMs`:** **integer milliseconds** = UTC midnight for **`today`** (not seconds). Same convention everywhere ([F.4](#f4-zset-score-standard-and-trim-boundary)). Pass as string; `tonumber` in Lua.
- **`trimMinScoreStr`:** Redis **exclusive** upper bound for removal: **`ZREMRANGEBYSCORE zkey -inf (<trimMinRetain`** removes members with **score strictly less than** `trimMinRetain`; **keeps** members with **score ≥ `trimMinRetain`**. Unit-test the **boundary day** (member score == `trimMinRetain`) stays in the ZSET ([F.4](#f4-zset-score-standard-and-trim-boundary)).
- **`ackTtlSeconds`:** **≥ maximum real-world retry window** (mobile: **1800–3600s** recommended). Shorter TTLs cause **`INVALID_SESSION`** after successful commits when the client resumes late ([§32](#32-api-response-envelope-read-streak-endpoints)).

**Return array (Redis-style):** `{ status, current, longest, lastDay }`

| `status` | Meaning |
|----------|---------|
| `1` | Success: streak/ZSET updated, **ack** set, **session `DEL`**. |
| `0` | Same-UTC-day idempotent streak path (ZSET touched; streak HASH already had `lastDay == today`). Ack + session teardown **still** applied. |
| `2` | **Already processed** (ack key exists — client retry). Session may already be deleted. |
| `-1` | Invalid session / wrong user or post / missing keys (and no **§32** Mongo idempotency fallback in handler). |
| `-3` | **Non-monotonic day:** `today < lastDay` in HASH — log, **no mutation** (clock bug / bad deploy). |

```lua
-- read_view_commit_merged.lua
-- KEYS[1] session, KEYS[2] streak HASH, KEYS[3] readDays ZSET, KEYS[4] ack key
-- ARGV: today, yesterday, zsetScoreMs, trimMinStr, lastUp, userId, postId, ackTtl

local sk = KEYS[1]
local streakKey = KEYS[2]
local zkey = KEYS[3]
local ackKey = KEYS[4]

local today = ARGV[1]
local yesterday = ARGV[2]
local score = tonumber(ARGV[3])
local trimMinStr = ARGV[4]
local lastUp = ARGV[5]
local uid = ARGV[6]
local pid = ARGV[7]
local ackTtl = tonumber(ARGV[8])

local function readStreak()
  local lastDay = redis.call('HGET', streakKey, 'lastDay')
  local cur = tonumber(redis.call('HGET', streakKey, 'current')) or 0
  local lng = tonumber(redis.call('HGET', streakKey, 'longest')) or 0
  return lastDay, cur, lng
end

if redis.call('EXISTS', ackKey) == 1 then
  local lastDay, cur, lng = readStreak()
  return { 2, cur, lng, lastDay or today }
end

-- Session deleted after success; retries must hit ack above, not fall through to -1.
if redis.call('EXISTS', sk) == 0 then
  return { -1, 0, 0, '' }
end

local u = redis.call('HGET', sk, 'userId')
local p = redis.call('HGET', sk, 'postId')
if (not u) or (not p) or u ~= uid or p ~= pid then
  return { -1, 0, 0, '' }
end

local ld0, _, _ = readStreak()
if ld0 and ld0 ~= '' and today < ld0 then
  return { -3, 0, 0, ld0 }
end

redis.call('ZADD', zkey, score, today)
-- Remove score < trimMinRetain; keep score >= trimMinRetain (see F.1 KEY/ARGV docs)
redis.call('ZREMRANGEBYSCORE', zkey, '-inf', '(' .. trimMinStr)

local lastDay, cur, lng = readStreak()
local applied = 1

if lastDay == today then
  applied = 0
else
  if (not lastDay) or (lastDay == '') then
    cur = 1
  elseif lastDay == yesterday then
    cur = cur + 1
  else
    cur = 1
  end
  if cur > lng then lng = cur end
  redis.call('HSET', streakKey,
    'current', cur,
    'longest', lng,
    'lastDay', today,
    'lastUpdated', lastUp
  )
end

if applied == 0 then
  redis.call('HSET', streakKey, 'lastUpdated', lastUp)
end

redis.call('SET', ackKey, '1', 'EX', ackTtl)
redis.call('DEL', sk)
return { applied, cur, lng, today }
```

**After Lua:** map first return value to HTTP: **`2` → `alreadyProcessed: true`**; **`1` / `0` → `alreadyProcessed: false`**; **`-3` → reject / no-op** (log `streak_day_non_monotonic` — do **not** mutate Redis); **`-1` → error** unless **[§32](#32-api-response-envelope-read-streak-endpoints)** Mongo row exists for today → **`alreadyProcessed`**. **Session TTL** alone is not enough under load — **`DEL` after success**; **ack** + **Mongo fallback** absorb retries.

**Note:** Weekly/monthly streaks **must not** read this HASH alone; recompute from ZSET/Mongo per [§18](#18-o1-rolling-streak--daily-only-with-edge-cases).

**Mandatory:** the HASH mutation block above is the **Lua port** of **`applyDailyStreakTransition`** ([§33](#33-single-source-streak-engine-shared-logic-layer)). **Golden tests** must keep TS and Lua outputs identical for the same inputs.

### F.2 Redis-native rate limits (recommended)

App-only limits can be bypassed if multiple entrypoints exist. Use **Redis counters** with TTL:

```ts
// e.g. per user per minute bucket for VIEW_START
const k = `read:start:${userId}:${minuteBucket}`;
const n = await redis.incr(k);
if (n === 1) await redis.expire(k, 60);
if (n > LIMIT) throw new RateLimitError();
```

Mirror for **IP** and optionally **sessionId**. Combine with application middleware.

### F.3 BullMQ retries, failed-job retention, and DLQ

Use a **dedicated DLQ queue** and move jobs there when attempts are exhausted (operational visibility + replay).

**Requirements:** `ioredis` with `maxRetriesPerRequest: null` for BullMQ; same connection options for `Queue`, `Worker`, `QueueEvents`.

```ts
// queues/readDayQueues.ts
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const READ_DAY_QUEUE = 'read-day';
export const READ_DAY_DLQ = 'read-day-dlq';

export const readDayQueue = new Queue(READ_DAY_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 7,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 86_400, count: 50_000 },
    removeOnFail: false,
  },
});

export const readDayDlq = new Queue(READ_DAY_DLQ, {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 10_000 },
    removeOnFail: false,
  },
});

const queueEvents = new QueueEvents(READ_DAY_QUEUE, { connection });

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  const job = await readDayQueue.getJob(jobId);
  if (!job) return;
  const max = job.opts.attempts ?? 1;
  if (job.attemptsMade < max) return;
  await readDayDlq.add(
    'exhausted',
    { ...job.data, failedReason, originalJobId: job.id },
    { jobId: `dlq:${job.id}` }
  );
});
```

`attemptsMade` vs `attempts` can vary slightly by BullMQ major version; confirm in staging that DLQ only receives jobs **after** the last retry. Equivalent pattern: `Worker` `on('failed', …)` with the same guard.

**Producer + hot Redis ordering ([§30](#30-real-time-ux-instant-flame)):**

```ts
async function persistReadDayThenRedis(
  userId: string,
  day: string,
  mongoUpsert: () => Promise<void>,
  runMergedCommitLua: () => Promise<void>
) {
  const jobId = `read-day:${userId}:${day}`;
  try {
    await readDayQueue.add('process-read-day', { userId, day }, { jobId });
  } catch {
    await mongoUpsert();
  }
  await runMergedCommitLua();
}
```

**Never** run merged Lua **before** a successful **`add`** or **sync Mongo upsert** for that `(userId, day)` — avoids **Redis-only** state if the process dies before enqueue.

**Worker:** instantiate `Worker` for `READ_DAY_QUEUE` as in [Appendix A](#appendix-a--bullmq-worker-sketch); optionally add `readDayDlq` consumer for alerts/replay tooling.

### F.4 ZSET score standard and trim boundary

**Score:** **always** UTC midnight for `dayBucket` in **epoch milliseconds** (integer). Do **not** mix seconds vs ms — ordering and trim windows break silently. The merged Lua uses **`tonumber(ARGV[3])`**; pass an **integer ms** string from the same helper that builds `today`.

**Trim:** let **`trimMinRetain`** be the **minimum score to keep** (ms). Policy: **keep members with `score >= trimMinRetain`**, **remove `score < trimMinRetain`**. In Redis: `ZREMRANGEBYSCORE key -inf (<trimMinRetain` — the `(` prefix makes the upper bound **exclusive**, so the member whose score **equals** `trimMinRetain` **remains**. Add an **integration test** for that exact boundary day.

### F.5 Longest streak durability

Redis **`longest`** can vanish on flush while `BlogReadDay` rows remain.

**Preferred (cheap, durable):** add **`readStreakLongest`** (number) on **Mongo `User`**. On each successful streak **current** computation (worker and/or reconciliation), **`if (current > readStreakLongest) update`** (use **`$max`** in Mongo or conditional update). Public/profile reads can use Redis for **current** but **fall back to `User.readStreakLongest`** when the HASH is cold.

**Supplement:** nightly reconciliation can still recompute from history to **correct** drift; Redis HASH remains a **cache**.

### F.6 Queue backpressure and Mongo circuit breaker

If **waiting** jobs grow (Redis list / BullMQ metrics), Mongo persistence **lags**. **Mitigations:** monitor **queue depth / oldest job age**, **autoscale workers**, and under extreme load **sync Mongo upsert** on the API path (same idempotency keys).

**Retry storm:** if **Mongo is unavailable**, BullMQ retries can **hammer** Redis and stall the system. **Circuit breaker:** when Mongo health checks fail, **pause** the read-day queue (`queue.pause()`), surface alerts, and **resume** when healthy — optionally drain with **limited** concurrency or DLQ after N failures ([F.3](#f3-bullmq-retries-failed-job-retention-and-dlq)).

### F.7 Redis memory policy (global)

Sessions, acks, and ZSETs can grow under traffic. Beyond per-key TTL and ZSET trim, set **`maxmemory-policy`** (e.g. **`allkeys-lru`** or **`volatile-lru`**) appropriate to your **cache vs queue** mix — **document** that eviction can drop hot paths and **reconciliation + worker heal** must restore them from Mongo.

**Key explosion:** enforce **prefix + TTL** on every ephemeral key; monitor **`used_memory`**, **`used_memory_peak`**, and approximate **key counts** / **hot-user cardinality** (sessions + acks per active user). Alert on abnormal growth.

### F.8 Observability (metrics & alerts)

Minimum production signals:

| Metric | Purpose |
|--------|---------|
| `streak_mismatch_total` | Reconciliation detected Redis ≠ Mongo (labels: reason) |
| `queue_lag_seconds` | BullMQ oldest **waiting** job age / p95 process time |
| `redis_heal_total` | Worker heal attempts (success vs `ZADD NX` no-op vs failure) |
| `invalid_session_rate` | VIEW_COMMIT rejects (distinguish abuse vs expired ack) |
| `read_day_worker_fail_total` | Mongo / Redis errors forcing retry |

Wire **alerts** on sustained mismatch rate, queue lag SLO breach, and heal failure spikes.

### F.9 Queue fairness (starvation)

A **heavy reader** can dominate one FIFO queue. **Mitigations:** **shard** by `hash(userId) % N` queues; **cap** jobs per user per minute at enqueue; or **batch** workers that **sample unique `userId`s** per round so one user cannot monopolize throughput ([F.6](#f6-queue-backpressure-and-mongo-circuit-breaker)).

---

## Production readiness: bugs, risks, and checklist

Ship **Tier 2** (Redis + queue + sessions) only after these issues are addressed. Several items duplicate earlier sections; this list is the **go-live gate**.

### Final audit — remaining hard blockers (short)

| Blocker | Fix (locked in spec) |
|---------|----------------------|
| Wrong `today`/`yesterday` from split clocks | **[F.0](#f0-time-arguments--single-server-source-mandatory)** — single server UTC source; assert calendar predecessor in app |
| Redis updated before any durable write | **[§30](#30-real-time-ux-instant-flame)** — **enqueue or Mongo upsert first**, then merged Lua |
| Session Lua + streak Lua not one atomic unit | **[F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)** — **one** `EVAL` |
| Reconciliation direction ambiguous | **[§31](#31-failure-modes--reconciliation)** — **Mongo wins** persisted days; **Redis rebuilt from Mongo** |
| Session memory / retries | **[F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)** — **`DEL` session** + **user-scoped ack** + TTL **≥ retry window** |
| Enqueue OK, crash before API Lua | **[§30](#30-real-time-ux-instant-flame)** + **[Appendix A](#appendix-a--bullmq-worker-sketch)** — **worker heals Redis** after Mongo upsert |
| Ack key collision | **[F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)** — `read:view_commit_ack:{userId}:{sessionId}` |
| Bad `today`/`yesterday` pair | **[F.0](#f0-time-arguments--single-server-source-mandatory)** — **assert** valid dates + `today === nextUtcCalendarDay(yesterday)` before Lua |
| `longest` without recompute cost | **[F.5](#f5-longest-streak-durability)** — **`User.readStreakLongest`**, bump when `current > stored` |
| ZSET trim off-by-one | **[F.4](#f4-zset-score-standard-and-trim-boundary)** — **keep score ≥ trimMin**; test boundary member |
| Worker overwrites immutable fields | **[Appendix A](#appendix-a--bullmq-worker-sketch)** — **`$setOnInsert`** vs **`$set`** |
| Redis memory / eviction | **[F.7](#f7-redis-memory-policy-global)** — `maxmemory-policy` + reconciliation |
| Mongo down retry storm | **[F.6](#f6-queue-backpressure-and-mongo-circuit-breaker)** — **pause queue** + circuit breaker |
| Heatmap stampede after Redis clear | **[Appendix D](#appendix-d--heatmap-ui-react-sketch)** — lazy warm + background job |
| Rate limit only in app | **[F.2](#f2-redis-native-rate-limits-recommended)** — Redis `INCR` + `EXPIRE` buckets |
| VIEW_COMMIT retry UX | **[§32](#32-api-response-envelope-read-streak-endpoints)** — `alreadyProcessed: true` |
| Queue pile-up | **[F.6](#f6-queue-backpressure-and-mongo-circuit-breaker)** — monitor depth, scale workers, optional sync path |
| Freeze vs recovery overlap | **[§26](#26-break-recovery-alternative--complement-to-freeze)** — **freeze applied ⇒ recovery disallowed** for that miss day |
| Worker heal double-increment | **[§30](#30-real-time-ux-instant-flame)** — **`ZADD NX`**; if member exists, **skip** HASH streak bump |
| Partial Redis rebuild | **[§31](#31-failure-modes--reconciliation)** — **always** ZSET **+** HASH; **ZSET↔HASH drift** rule |
| Mobile ack expired | **[§32](#32-api-response-envelope-read-streak-endpoints)** — **30–60 min** ack + **Mongo `BlogReadDay` fallback** |
| Worker Mongo OK, Redis heal failed | **[§31](#31-failure-modes--reconciliation)** — **throw** → job retry + reconciliation |
| Day monotonicity | **[F.0](#f0-time-arguments--single-server-source-mandatory)** / **[F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)** — `today >= lastDay` guard, return **`-3`** |
| Redis key / memory growth | **[F.7](#f7-redis-memory-policy-global)** — prefix, TTL, **`used_memory`**, key cardinality alerts |
| Queue unfairness | **[F.9](#f9-queue-fairness-starvation)** — shard / per-user cap / fair batching |
| No visibility | **[F.8](#f8-observability-metrics--alerts)** — mismatch, lag, heal, invalid session metrics |
| Logic drift (Lua vs worker vs job) | **[§33](#33-single-source-streak-engine-shared-logic-layer)** — **Golden Test Contract** (mandatory CI); **two** implementations only: TS engine + Lua mirror |
| Inline worker/controller streak `if` | **[§33](#33-single-source-streak-engine-shared-logic-layer)** — **forbidden**; lint + review |
| Monotonicity only in Lua | **[F.0](#f0-time-arguments--single-server-source-mandatory)** + **[§33](#33-single-source-streak-engine-shared-logic-layer)** — API **`STREAK_MONOTONICITY_BROKEN`** **and** Lua **`-3`** |

### Critical (fix first)

| # | Risk | Why it breaks production | Fix |
|---|------|---------------------------|-----|
| 1 | **Redis-first UX vs durability** | Redis reset or worker failure while Mongo lags → user sees **wrong** streak or “lost” streak despite durable data. | Treat Redis as **temporary**; run **mandatory** daily reconciliation: **rebuild `streak:daily` / ZSET from Mongo** when mismatch (see [§31](#31-failure-modes--reconciliation)). |
| 2 | **Daily double-count race** | Two concurrent commits (tabs) can both pass `today !== lastDay` and **increment twice**. | **[Appendix F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)** — one `EVAL` (session + streak + ZSET + ack + `DEL` session) ([§18](#18-o1-rolling-streak--daily-only-with-edge-cases)). |
| 3 | **Weekly/monthly wrong** | O(1) linear recurrence ≠ ISO week / calendar month semantics (e.g. Mon + Sun same week). | **Never** use daily O(1) HASH for weekly/monthly; compute from **bounded ZSET** or **Mongo** with same rules as `readStreak.service.ts` ([§18](#18-o1-rolling-streak--daily-only-with-edge-cases)). |
| 4 | **Queue = silent data loss** | Queue down → Redis updated, Mongo not → **permanent** inconsistency without repair. | **[F.3](#f3-bullmq-retries-failed-job-retention-and-dlq)** + **[§30](#30-real-time-ux-instant-flame)** ordering (persist **before** hot Redis); DLQ; reconciliation ([§31](#31-failure-modes--reconciliation)). |
| 5 | **VIEW_COMMIT replay** | Same `sessionId` reused → double apply. | **[F.1](#f1-merged-view_commit-lua-session--streak--zset--ack)** — atomic session validate + streak; **ack** + **`DEL` session**; **[§32](#32-api-response-envelope-read-streak-endpoints)** `alreadyProcessed` ([§16](#16-two-step-read-lifecycle-view_start--view_commit)). |
| 6 | **Client-faked engagement** | `activeMs: 999999` etc. | **Server:** `now - startTime` ≥ `MIN_TIME`; cap / ignore client vs wall clock; never trust client alone ([§21](#21-advanced-anti-cheat-beyond-dwell-time)). |
| 7 | **Batch duplication** | Same `(userId, day)` repeated in one batch → redundant work or skew. | **Dedupe** before `bulkWrite` ([§28](#28-queue-batching)). |
| 8 | **Heatmap dual-source drift** | ZSET vs Mongo differ. | **Rule:** **Mongo = final truth** for persisted days; on mismatch **overwrite Redis** from Mongo ([Appendix D](#appendix-d--heatmap-ui-react-sketch)). |
| 9 | **Timezone confusion** | Local UI vs UTC logic. | **Copy / settings:** “Streak uses **UTC calendar days**.” Local time **display-only**, never for bucket math ([Shipped behavior](#shipped-behavior-current)). |
| 10 | **Freeze vs recovery** | Overlapping rules → double save or wrong reset. | **Hard rule:** if **freeze** applied for a miss day, **recovery** **cannot** apply to that same miss ([§26](#26-break-recovery-alternative--complement-to-freeze)); keep O(1) state consistent ([§18](#18-o1-rolling-streak--daily-only-with-edge-cases)). |

### Important (next)

| # | Risk | Fix |
|---|------|-----|
| 11 | **ZSET unbounded growth** | Trim with **`ZREMRANGEBYSCORE`** (or on insert) — keep ~**400 days** max in Redis ([§19](#19-time-bounded-hot-window-in-redis)). |
| 12 | **Spam on /read/start** | **Redis `INCR` + `EXPIRE`** buckets ([F.2](#f2-redis-native-rate-limits-recommended)) **and** app limits ([§21](#21-advanced-anti-cheat-beyond-dwell-time)). |
| 13 | **Batch partial failure** | `bulkWrite({ ordered: false })`; **retry** failed ops; idempotent upserts ([§28](#28-queue-batching)). |
| 14 | **Redis unavailable** | **Degrade:** direct **Mongo upsert** + in-process dedupe (or DB unique index); skip queue or retry later ([§31](#31-failure-modes--reconciliation), [What not to overbuild early](#what-not-to-overbuild-early)). |

### Design risks (not code bugs)

| # | Topic | Guidance |
|---|-------|----------|
| 15 | **Multiple streak types** | **Primary = basic**; others **badges / secondary** only — avoid “which streak am I losing?” ([§23](#23-streak-types-product-differentiator)). |
| 16 | **Instant UI vs Mongo lag** | OK for UX if **reconciliation** and **Mongo fallback** exist; otherwise misleading. |

### Go-live checklist

Ship **only** if:

- [ ] **Worker heal idempotent** — **`ZADD NX`**; **no** blind streak re-apply when member exists ([§30](#30-real-time-ux-instant-flame))
- [ ] **Redis rebuild full** — ZSET **and** HASH together; **ZSET↔HASH drift** detection ([§31](#31-failure-modes--reconciliation))
- [ ] **Ack TTL** — **30–60 min** class for mobile; **§32** **`BlogReadDay`** fallback when session+ack gone
- [ ] **Worker** — after Mongo upsert **always** attempt Redis heal; **throw** on heal failure → retry; **`$setOnInsert` / `$set`** ([Appendix A](#appendix-a--bullmq-worker-sketch))
- [ ] **Day monotonicity** — **`today >= lastDay`** guard; Lua **`-3`** ([F.0](#f0-time-arguments--single-server-source-mandatory), [F.1](#f1-merged-view_commit-lua-session--streak--zset--ack))
- [ ] **§33 Single Source Streak Engine** + **Golden Test Contract** (shared `dailyStreakGoldenCases`; TS ≡ Lua `EVAL`); **`STREAK_MONOTONICITY_BROKEN`** in API before Lua; **no** duplicate transition logic outside streak module + Lua
- [ ] **Merged commit Lua** + **F.0** asserts + **user-scoped ack** ([F.1](#f1-merged-view_commit-lua-session--streak--zset--ack))
- [ ] **Persist before hot Redis** — **[§30](#30-real-time-ux-instant-flame)**
- [ ] **Mongo reconciliation** + **`User.readStreakLongest`** — **[§31](#31-failure-modes--reconciliation)**, **[F.5](#f5-longest-streak-durability)**
- [ ] Queue **retry + DLQ** + **F.6** circuit breaker + **F.9** fairness
- [ ] **Metrics** — **[F.8](#f8-observability-metrics--alerts)**; **Redis memory / keys** — **[F.7](#f7-redis-memory-policy-global)**
- [ ] **ZSET** — **[F.4](#f4-zset-score-standard-and-trim-boundary)**; **Heatmap** warm — **[Appendix D](#appendix-d--heatmap-ui-react-sketch)**; **F.2** rate limits; weekly/monthly not O(1) daily only
- [ ] **Freeze vs recovery** — **[§26](#26-break-recovery-alternative--complement-to-freeze)** hard exclusivity

---

## Appendix G — Optional polish (post–go-live)

Not required to ship Tier 2, but valuable for **real-world confidence**:

- **Chaos / failure drills:** Redis unavailable mid-commit; queue paused; worker killed after Mongo before heal; duplicate job delivery; clock skew simulation; verify **§32** Mongo fallback and **worker `ZADD NX`** idempotency.
- **Load tests:** sustained **10k–100k** DAU-class **read-day** enqueue + worker + Redis heal; watch **F.8** metrics and **F.6** lag.
- **Dashboards:** Grafana / Prometheus (or vendor equivalent) for **`queue_lag_seconds`**, **`streak_mismatch_total`**, **`redis_heal_total`**, **`invalid_session_rate`**, Redis memory.

Say **go** in implementation planning when you want these turned into concrete runbooks and scripts.

---

## Notes

- Guests do not accumulate read days until they sign in and trigger read recording.
- Reads before ship date are **not** backfilled unless you run a one-off job.