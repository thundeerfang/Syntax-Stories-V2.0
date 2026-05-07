
Here’s the full flow of profile view analytics and how views are counted.

---

# Profile view analytics – end-to-end flow

## 1. When a view is recorded

Views are recorded only when someone opens the **public profile** at `/u/[username]`.

- **Profile page** (`/profile`) does **not** call the analytics API.
- Only the **public profile page** (`/u/[username]`) does.

---

## 2. Frontend: public profile page (`/u/[username]`)

**File:** `webapp/src/app/u/[username]/page.tsx`

1. Page loads and fetches the public profile (e.g. via `followApi.getPublicProfile`).
2. A `useEffect` runs when `username`, `profile`, and `currentUser?.username` are available:
   - If **no username or no profile** → do nothing.
   - If **current user is the profile owner** (`currentUser?.username === username`, case-insensitive) → **do not call the API** (no self-views).
   - Otherwise → call `analyticsApi.recordProfileView(username)` (fire-and-forget).

So: only non-owner visits to `/u/[username]` trigger a view.

---

## 3. Client API: `recordProfileView`

**File:** `webapp/src/api/analytics.ts`

- **URL:** `POST /api/analytics/profile-view/:username`
- **Options:** `credentials: 'include'` (so the `ss_anon` cookie is sent), no auth token in headers.
- **Body:** `{}`
- Errors are ignored (best-effort).

---

## 4. Backend: route and middleware

**File:** `server/src/routes/analytics.routes.ts`

- Route: `POST /api/analytics/profile-view/:username`
- Middleware: **rate limit** only (no auth).
- Handler: `recordProfileView`.

**Rate limit** (`server/src/middlewares/analytics/rateLimitProfileView.ts`):

- Key: `rl:analytics:profile-view:{ip}` in Redis.
- Limit: **100 requests per IP per 60 seconds**.
- If Redis is down, the middleware continues (fail-open).

---

## 5. Backend: `recordProfileView` (controller)

**File:** `server/src/controllers/analytics.controller.ts`

### 5.1 Input and validation

- Read `username` from `req.params`.
- Optional `viewer` from `req.user` (only set if some other middleware attached it; for this route there is no auth middleware, so usually no viewer).
- **Bot filter:** if `User-Agent` contains e.g. `googlebot`, `bingbot`, `curl`, `wget`, `headlesschrome` → respond `{ success: true, counted: false }` and return (no write).
- If `username` is missing → 400.
- Resolve user by `username` (active user); if not found → 404.

### 5.2 Self-view

- If `viewer._id === profileUser._id` → respond `{ success: true, counted: false }` and return (no write).

### 5.3 Visitor identity and `visitorId`

- **Day bucket:** `dayBucket = getDayBucket(now)` → `YYYY-MM-DD` (UTC).
- **Logged-in:** `viewerIdStr = String(viewer._id)` when `viewer` exists.
- **Anonymous:**
  - If no `viewerIdStr`:
    - If cookie `ss_anon` exists → use it as `anonKey`.
    - Else generate new `anonKey` (ObjectId hex), set `res.cookie('ss_anon', anonKey, { httpOnly: false, sameSite: 'lax', maxAge: 1 year })`.
- **Unified visitor id:**  
  `visitorId = SHA256(baseId + '|' + ip + '|' + userAgent)`  
  where `baseId = viewerIdStr || anonKey || 'anon'`.  
  So: same user/browser + same IP + same UA → same `visitorId` per day.

### 5.4 “Returning” check

- Query: does there exist a `ProfileViewEvent` for this `profileUserId`, this `visitorId`, and any `dayBucket < today`?
- If yes → `hadPrevious = true` (used later for `returningVisitors`).

### 5.5 Atomic deduplication (one view per visitor per day)

- **Try** insert one document into **ProfileViewEvent** with:
  - `profileUserId`, `viewerUserId` (if logged-in), `anonKey` (if anon), `visitorId`, `dayBucket`, `createdAt`, `source: 'u_page'`.
- Collection has a **unique index** on `(profileUserId, visitorId, dayBucket, source)`.
- If insert **succeeds** → first view from this visitor for this profile today:
  - Set `counted = true`.
  - Prepare increments: `totalViews: 1`, `uniqueVisitors: 1`, and either `loggedInVisitors: 1` or `anonymousVisitors: 1`; if `hadPrevious` then also `returningVisitors: 1`.
- If insert **fails with duplicate key (E11000)** → same visitor already counted today:
  - Respond `{ success: true, counted: false }` and return (no metrics update).

### 5.6 Writing aggregates and generic event

- If `counted`:
  - **ProfileDailyMetrics:** `findOneAndUpdate` for `(profileUserId, date: dayBucket)` with `$inc` of the above fields and `$set: { lastUpdatedAt: now }`, **upsert: true**.
  - **Dual-write:** `AnalyticsEventModel.create` with `type: 'profile_view'`, `targetType: 'profile'`, `targetId: profileUserId`, `visitorId`, `actorId` if logged-in, `timestamp: now` (fire-and-forget, errors caught).

Response: `{ success: true, counted: true/false }`.

---

## 6. Data models

### 6.1 Raw events: `ProfileViewEvent`  
**File:** `server/src/models/ProfileAnalytics.ts`

- One document per **unique** (profile, visitor, day, source).
- Fields: `profileUserId`, `viewerUserId?`, `anonKey?`, `visitorId`, `dayBucket`, `createdAt`, `source`.
- **Unique index:** `(profileUserId, visitorId, dayBucket, source)` → enforces “at most one view per visitor per profile per day”.
- TTL index on `createdAt` (e.g. 90 days) for retention.

### 6.2 Daily aggregates: `ProfileDailyMetrics`  
**Same file**

- One document per (profile, date).
- Fields: `profileUserId`, `date` (YYYY-MM-DD), `uniqueVisitors`, `totalViews`, `loggedInVisitors`, `anonymousVisitors`, `returningVisitors`, `lastUpdatedAt`.
- Unique index on `(profileUserId, date)`.

### 6.3 Generic events: `AnalyticsEvent`  
**File:** `server/src/models/AnalyticsEvent.ts`

- For future use (e.g. post views, likes, follows).
- Each profile view is also written here as `type: 'profile_view'`, `targetType: 'profile'`, `targetId`, `visitorId`, `actorId?`, `timestamp`.

---

## 7. How “views” behave (summary)

| Scenario | Result |
|----------|--------|
| Owner opens `/u/theirname` | No request sent (frontend guard). |
| Same anon visitor refreshes many times same day | First request creates event and increments metrics; later requests hit unique index → `counted: false`, no extra count. |
| Same anon next day | New day bucket → new event and +1 view again. |
| Bot/crawler (UA match) | No event, no metrics. |
| Same IP, different browser/UA | Different `visitorId` → each can add 1 view per day. |
| Logged-in user (if `req.user` set) | Treated as logged-in in metrics (`loggedInVisitors`); self-view still skipped if same user as profile. |

So: **one view per visitor per profile per day**; “visitor” = `visitorId` (hash of identity + IP + UA).

---

## 8. Reading analytics: profile page

**File:** `webapp/src/app/profile/page.tsx`

When the logged-in user has a `username`, two effects run:

1. **Overview:**  
   `GET /api/analytics/profile-overview/:username`  
   → `analyticsApi.getProfileOverview(username)`  
   → stored in `overviewMetrics` and shown in the “Profile Activity” card (today, 7d, 30d, unique/repeat, total).

2. **Time series:**  
   `GET /api/analytics/profile/:username/timeseries`  
   → `analyticsApi.getProfileTimeSeries(username)`  
   → stored in `timeSeries` and used for the “Views this month” chart (e.g. last 30 days).

---

## 9. Overview and timeseries endpoints (backend)

**File:** `server/src/controllers/analytics.controller.ts`

### 9.1 `getProfileOverview`

- Resolve user by `username`, 400/404 if invalid.
- **Cache:** Redis key `profile:analytics:{username}`, TTL 60s. On hit, return cached JSON.
- **Compute:** From `ProfileDailyMetrics` for that `profileUserId` and `date` in last 30 days:
  - Sum `totalViews` for today → `viewsToday`.
  - Sum `totalViews` for last 7 days → `views7Days`; sum `uniqueVisitors` → `uniqueVisitors7Days`; sum `returningVisitors` → `repeatVisitors7Days`.
  - Sum `totalViews` for last 30 days → `views30Days` and `totalViews`.
- Cache and return `{ success: true, metrics: { viewsToday, views7Days, views30Days, uniqueVisitors7Days, repeatVisitors7Days, totalViews } }`.

### 9.2 `getProfileTimeSeries`

- Same user resolution.
- **Cache:** Redis key `profile:analytics:{username}:timeseries`, TTL 60s.
- **Compute:** From `ProfileDailyMetrics` for last 30 days, sorted by `date`, return `[{ date, views: totalViews }, ...]`.
- Cache and return `{ success: true, series }`.

---

## 10. End-to-end flow diagram

```
User opens /u/[username]
        │
        ▼
┌─────────────────────────────────────┐
│ Public profile page (React)          │
│ • Load profile                       │
│ • If owner → skip analytics          │
│ • Else POST recordProfileView       │
└─────────────────────────────────────┘
        │
        ▼
POST /api/analytics/profile-view/:username
        │
        ├─ rateLimitProfileView (100/IP/min)
        │
        ▼
recordProfileView
        │
        ├─ Bot? → 200, counted: false
        ├─ Self? → 200, counted: false
        ├─ Resolve visitorId (cookie + IP + UA)
        ├─ hadPrevious (returning?)
        │
        ├─ ProfileViewEvent.create(...)
        │     ├─ OK → counted = true, build $inc
        │     └─ E11000 (duplicate) → 200, counted: false
        │
        ├─ if counted:
        │     ProfileDailyMetrics.findOneAndUpdate ($inc, upsert)
        │     AnalyticsEvent.create(profile_view)
        │
        └─ 200 { success: true, counted }
```

**Reading (profile page):**

```
Profile page loads (logged-in user)
        │
        ├─ GET profile-overview/:username  → Redis or ProfileDailyMetrics → overviewMetrics
        └─ GET profile/:username/timeseries → Redis or ProfileDailyMetrics → timeSeries
        │
        └─ UI: Profile Activity card + charts
```

That’s the full flow: who triggers a view, how it’s deduplicated, how it’s stored, and how the profile page gets and displays the numbers.



Your list matches how the system works today. Here’s a tight mapping to the code and why each is “good enough for now” vs “scale later.”

---

### 1. **Fingerprint can be gamed**

**Where:** `server/src/controllers/analytics.controller.ts` — `visitorId = SHA256(baseId|ip|ua)`.

**Reality:** Changing User-Agent or IP gives a new `visitorId`, so one person can inflate “unique” views. Adding screen size, timezone, language, device memory, canvas fingerprint, etc. would require client-side data and a richer fingerprint; that’s device fingerprinting. You don’t need it until abuse or scale justifies it.

---

### 2. **IP should be normalized**

**Where:** Same controller uses `req.ip`.

**Reality:** Behind a reverse proxy/CDN, `req.ip` can be the proxy’s IP unless Express trusts the proxy. You want:

- `app.set('trust proxy', 1)` (or your deployment’s value) so `req.ip` is taken from `X-Forwarded-For`.
- Optionally normalize: take the leftmost (client) IP from `X-Forwarded-For` and use that for hashing/rate limiting.

Until you’re behind a proxy, current behavior is fine; fix when you add one.

---

### 3. **Returning-visitor query may become slow**

**Where:** `ProfileViewEventModel.exists({ profileUserId, visitorId, dayBucket: { $lt: dayBucket } })` before each insert.

**Reality:** That’s an existence check on an indexed collection; it’s cheap at moderate scale. At very large scale (millions of events), a separate “visitor” or “firstSeenAt” store (e.g. Redis or a small table keyed by `profileUserId + visitorId`) avoids this read. No change needed until volume grows.

---

### 4. **Bot filtering can be bypassed**

**Where:** Controller checks `User-Agent` against a small blocklist (`googlebot`, `curl`, etc.).

**Reality:** Trivial to bypass with a browser-like UA. Stronger signals (no JS, no cookies, very fast requests, datacenter IP ranges, behavioral patterns) need more infrastructure. For now, UA filtering plus rate limiting is a reasonable first layer; you can add heuristics and IP/datacenter checks later if bot traffic becomes a problem.

---

### 5. **Analytics writes in API thread**

**Where:** In `recordProfileView`, you do `ProfileViewEventModel.create`, then `ProfileDailyMetricsModel.findOneAndUpdate`, then `AnalyticsEventModel.create` in the request path.

**Reality:** That keeps the API latency tied to MongoDB. The “right” evolution is: API enqueues a message (Redis Stream, Kafka, etc.), returns immediately, and a worker does the three writes. You’ve already considered a sink/queue abstraction; when traffic justifies it, you’d switch that sink to “enqueue” instead of “write direct.” No change needed until the API starts feeling slow or DB load is high.

---

### 6. **Missing anomaly detection**

**Where:** Every event that passes dedupe and bot check is counted; no spike or flood detection.

**Reality:** You don’t currently detect “profile usually 50/day, suddenly 20k.” That would be a separate layer: time-series or aggregate checks (e.g. per-profile or per-visitor rate over time) and then either alerting or temporary blocking/throttling. Add when abuse or noise becomes a real issue.

---

### 7. **Cache invalidation is simple**

**Where:** Overview and timeseries use Redis with a 60s TTL; no invalidation on new events.

**Reality:** New views can take up to 60s to show in the dashboard. For profile analytics that’s usually acceptable. “Perfect” would be: on each counted view, delete or bump the keys for that profile so the next read is fresh—but that adds work on the write path. TTL-only is a good tradeoff until you need near–real-time accuracy.

---

**Summary:** Your list is accurate: fingerprint is gameable, IP should be proxy-aware when you use one, returning-visitor query and in-request writes are fine until scale grows, bot filtering and anomaly detection can be strengthened later, and TTL cache is acceptable. Nothing here is urgent; they’re the right “later” improvements to keep in mind.