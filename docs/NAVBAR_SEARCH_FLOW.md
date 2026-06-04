# Navbar search — end-to-end flow

How the global **Command Palette / Search Terminal** works from the navbar (`⌘K`) through APIs, Redis, and navigation.

**Related specs:** `docs/NAVBAR_SEARCH_FLOW.md` (this file), `docs/BOOKMARKS_FLOW.md`, Topics taxonomy (`GET /api/blog/taxonomy/categories`, `GET /api/blog/tags/list`).

---

## Status summary

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Users only (`GET /api/follow/search`) | **Superseded** |
| **1** | Unified API + Redis result cache + min 3 chars | **Done** |
| **2** | Warm Redis entity indexes + in-memory filter | **Done** |
| **3** | Blogs full-text (title/summary) + `$text` index | **Done** |
| **4** | Rate limit + optional Meilisearch at scale | Partial (rate limit done) |

---

## 1. Vision — one search, every surface

The navbar opens a **unified search dialog** that finds:

| Group | Entity | Example query | Navigate to |
|-------|--------|---------------|-------------|
| **People** | Users | `jane`, `dev` | `/u/{username}` |
| **Topics** | Tags | `react`, `rust` | `/topics/{slug}` |
| **Topics** | Categories | `backend`, `ai` | `/topics/category/{slug}` |
| **Community** | Squads (public) | `syntax`, `frontend` | `/squads/{slug}` |
| **Content** | Blog posts | `hooks guide` | `/blogs/{username}/{slug}` |
| **App** | Features / pages | `bookmarks`, `achievements`, `write` | Static route (see §8) |

Navbar CTA today says **"Search Stories..."** — after Phase 1 the dialog matches that promise (posts + topics + people + app shortcuts).

---

## 2. High-level target diagram (Phase 1+)

```text
User opens search (Navbar / ⌘K / Ctrl+K)
        │
        ▼
SearchDialog — query state, debounce, keyboard nav
        │
        ├── q.length < 3  →  idle / recents / feature shortcuts (no API)
        │
        └── q.length ≥ 3  →  debounce 200ms
                    │
                    ▼
        GET /api/search?q={q}&types=all&limit=5
                    │
        ┌───────────┴───────────┐
        │ Server (parallel)      │
        │ 1. Redis GET cache     │── hit → return JSON (~1–5ms)
        │ 2. Miss → fan-out:     │
        │    • users             │
        │    • tags (Redis idx)  │
        │    • categories (idx)  │
        │    • squads (idx)      │
        │    • blogs (Mongo/FT)  │
        │ 3. SET cache TTL 45s   │
        └───────────┬───────────┘
                    │
                    ▼
        Grouped results UI (sections per type)
                    │
        Click / Enter → router.push(href) + close()
```

**Fast path budget (p95 target, warm Redis):**

| Step | Target |
|------|--------|
| Client debounce | 200ms (user-perceived; not counted in server SLA) |
| Redis cache hit | **1–5ms** server time |
| Redis index miss, parallel Mongo | **15–40ms** server time |
| Cold blog text search (Phase 3) | **30–80ms** with `$text` index |
| Full response to browser | **< 100ms** p95 on cache hit; **< 150ms** on miss |

---

## 3. Minimum 3 characters rule

### 3.1 Why

- Avoids overly broad regex scans on Mongo (`users`, `squads`, posts).
- Reduces Redis/Mongo load from single-key typos and bot traffic.
- Matches common UX (GitHub, Slack, many command palettes).

### 3.2 Client behavior

| Query length | Behavior |
|--------------|----------|
| `0` | Idle state: keyboard legend + **Quick links** (features catalog, recent picks) |
| `1–2` | Hint: *"Type at least 3 characters to search"* — **no network request** |
| `≥ 3` | Debounced unified search request |

**Constants (proposed):**

```typescript
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 200;   // down from 280ms for snappier feel
const SEARCH_STALE_GUARD = true;  // requestIdRef pattern (keep existing)
```

### 3.3 Server enforcement

`GET /api/search` returns `200` with empty groups when `q.trim().length < 3`:

```json
{
  "success": true,
  "q": "ab",
  "minChars": 3,
  "groups": {}
}
```

Optional rate limit: **30 req/min/IP** for `/api/search` (Redis sliding window).

---

## 4. Redis architecture

Syntax Stories already uses **`redis` ^4.7** (`server/src/config/redis.ts`, `getRedis()`). Search extends the same client — **no new infra in Phase 1–2**.

### 4.1 Key namespace

Add to `server/src/shared/redis/keys.ts`:

```typescript
search: {
  /** Full unified response JSON for a normalized query hash. TTL ~45s. */
  result: (qHash: string) => `search:result:${qHash}`,
  /** Rate limit bucket per IP minute. */
  rateLimit: (ip: string, minute: number) => `search:rl:${ip}:${minute}`,
  /** Warm document indexes (JSON arrays, rebuilt on taxonomy/blog events). */
  index: {
    tags: 'search:index:tags',
    categories: 'search:index:categories',
    squads: 'search:index:squads',
    features: 'search:index:features',
    blogsRecent: 'search:index:blogs:recent', // top N published, Phase 2
  },
},
```

**Query normalization for cache keys:**

1. Trim, lowercase, collapse whitespace.
2. Strip diacritics optional (Phase 2).
3. SHA-256 first 16 hex chars → `qHash` (avoid huge keys).

### 4.2 Layer A — response cache (Phase 1, biggest win)

On every successful unified search:

```
SET search:result:{qHash} {json} EX 45
```

On cache hit: **single `GET`** → parse → return. Typical **1–5ms** in-process.

Invalidate: optional; TTL-only is fine for v1 (eventual consistency ≤45s).

### 4.3 Layer B — warm entity indexes (Phase 2)

Taxonomy and squads change infrequently vs reads. Keep **compact JSON** in Redis:

| Key | Source | Refresh trigger |
|-----|--------|-----------------|
| `search:index:tags` | `blogTaxonomy.service` tag rows | Admin taxonomy CRUD, post publish (debounced 30s) |
| `search:index:categories` | category rows | Same |
| `search:index:squads` | public squads (`visibility: public`) | Squad create/update |
| `search:index:features` | static webapp catalog (§8) | Deploy / admin seed |
| `search:index:blogs:recent` | last 500 published titles | Publish/unpublish worker |

Each document shape (minimal for speed):

```typescript
type SearchIndexDoc = {
  id: string;       // stable key for dedupe
  type: SearchEntityType;
  label: string;    // primary display
  sublabel?: string;
  href: string;
  tokens: string;   // precomputed "react hooks frontend" lowercase
  rank?: number;    // postCount, memberCount, etc.
};
```

**In-index filter (Phase 2):** load JSON from Redis (~1ms), run **FlexSearch** (see §10) in Node **< 5ms** for ~5k docs → merge with user/blog Mongo hits.

### 4.4 Layer C — Redis Stack / RediSearch (optional Phase 4)

If doc count exceeds ~50k or sub-5ms is required at scale:

- **Redis Stack** `FT.SEARCH` on HASH indices per entity type.
- Requires Redis Stack deployment (not plain Redis).

Defer until metrics show Phase 2 insufficient.

### 4.5 Fail-open

If Redis unavailable (`getRedis()` → `null`):

- Skip cache read/write.
- Fall back to parallel Mongo queries (same as today’s user search pattern).
- Log `[search] redis degraded`.

---

## 5. Unified API — `GET /api/search`

**Route (proposed):** `server/src/routes/search.routes.ts` → mount at `/api/search`.

### 5.1 Query parameters

| Param | Default | Description |
|-------|---------|-------------|
| `q` | required | Search string (min 3 enforced server-side) |
| `types` | `all` | Comma list: `users,tags,categories,squads,blogs,features` |
| `limit` | `5` | Max hits **per group** (cap 10) |

### 5.2 Response shape

```typescript
interface UnifiedSearchResponse {
  success: true;
  q: string;
  minChars: 3;
  cached: boolean;
  tookMs: number;
  groups: {
    users?: SearchHit[];
    tags?: SearchHit[];
    categories?: SearchHit[];
    squads?: SearchHit[];
    blogs?: SearchHit[];
    features?: SearchHit[];
  };
}

interface SearchHit {
  id: string;
  type: 'user' | 'tag' | 'category' | 'squad' | 'blog' | 'feature';
  label: string;
  sublabel?: string;
  href: string;
  imageUrl?: string;
  meta?: { postCount?: number; memberCount?: number };
}
```

### 5.3 Server execution — quickest path

```typescript
async function unifiedSearch(q: string, types: string[], limit: number) {
  const t0 = performance.now();
  const redis = getRedis();
  const qHash = hashQuery(q);

  // 1) Redis response cache
  if (redis) {
    const hit = await redis.get(redisKeys.search.result(qHash));
    if (hit) return { ...JSON.parse(hit), cached: true, tookMs: performance.now() - t0 };
  }

  // 2) Parallel fan-out (only requested types)
  const [users, tags, categories, squads, blogs, features] = await Promise.all([
    types.includes('users') ? searchUsers(q, limit) : EMPTY,
    types.includes('tags') ? searchTags(q, limit) : EMPTY,
    types.includes('categories') ? searchCategories(q, limit) : EMPTY,
    types.includes('squads') ? searchSquads(q, limit) : EMPTY,
    types.includes('blogs') ? searchBlogs(q, limit) : EMPTY,
    types.includes('features') ? searchFeatures(q, limit) : EMPTY,
  ]);

  const body = { success: true, q, minChars: 3, cached: false, groups: { ... } };
  if (redis) void redis.set(redisKeys.search.result(qHash), JSON.stringify(body), { EX: 45 });
  return { ...body, tookMs: performance.now() - t0 };
}
```

**Per-entity strategies:**

| Entity | Phase 1 (ship fast) | Phase 2 (Redis index) | Phase 3+ |
|--------|---------------------|------------------------|----------|
| **Users** | Mongo regex `username\|fullName`, limit 5 | Same + optional prefix cache | — |
| **Tags** | Mongo/`blogTaxonomy` filter | Redis JSON + FlexSearch | — |
| **Categories** | Same | Redis JSON + FlexSearch | — |
| **Squads** | Mongo regex on `name\|slug\|description`, `visibility: public` | Redis JSON + FlexSearch | — |
| **Blogs** | Mongo regex on `title`, `summary` (published) | `$text` index + score sort | Meilisearch |
| **Features** | Static array filter in Node | Redis JSON + FlexSearch | Client-only (§8.2) |

### 5.4 Mongo indexes (Phase 1)

```javascript
// users — existing
{ username: 1 }, { fullName: 1 }, { isActive: 1 }

// squads
{ visibility: 1, name: 1 }
{ visibility: 1, slug: 1 }

// blogposts — Phase 3
db.blogposts.createIndex(
  { title: 'text', summary: 'text' },
  { weights: { title: 10, summary: 3 }, name: 'blog_search_text' }
)
// partialFilterExpression: { status: 'published', deletedAt: null }
```

---

## 6. Per-entity navigation map

| Type | Match fields | `href` pattern | Auth to view |
|------|--------------|----------------|--------------|
| `user` | `username`, `fullName` | `/u/{username}` | Public profile |
| `tag` | `name`, `slug` | `/topics/{slug}` | Public |
| `category` | `name`, `slug` | `/topics/category/{slug}` | Public |
| `squad` | `name`, `slug`, `description` | `/squads/{slug}` | Public squads only in search |
| `blog` | `title`, `summary`, `slug` | `/blogs/{username}/{slug}` | Public published |
| `feature` | `label`, `keywords[]` | static `href` | Route guard on page |

---

## 7. Phase 0 — current implementation (users only)

> **Shipped today.** Keep until Phase 1 replaces the dialog data source.

### 7.1 Entry points

| Surface | Trigger |
|---------|---------|
| Navbar desktop | "Search Stories..." button + `⌘K` badge |
| Navbar mobile | Search icon |
| Global shortcut | `⌘K` / `Ctrl+K` via `SearchDialogWrapper` |

**Files:**

| Area | Path |
|------|------|
| Navbar | `webapp/src/components/layout/nav/Navbar.tsx` |
| Wrapper + shortcut | `webapp/src/components/search/SearchDialogWrapper.tsx` |
| Dialog UI | `webapp/src/components/search/SearchDialog.tsx` |
| Zustand store | `webapp/src/store/searchDialog.ts` |
| API client | `webapp/src/api/follow.ts` → `followApi.searchUsers` |
| Server | `GET /api/follow/search?q=` → `follow.controller.ts` → `searchUsers` |

### 7.2 Current flow

```text
open → type (debounce 280ms, no min length) → GET /api/follow/search → max 10 users → /u/{username}
```

| Constant | Value |
|----------|-------|
| `DEBOUNCE_MS` | 280 |
| Min chars | **none** (Phase 1 adds 3) |
| Result limit | 10 users |

### 7.3 Shared with editor @mentions

`RichParagraphEditor.tsx` calls the same `followApi.searchUsers` (250ms debounce) for `@` mentions — **unchanged**; unified search is navbar-only.

---

## 8. Webapp features catalog (instant, 0ms)

App **features** are a **static curated list** — no Mongo round-trip. Filter client-side for `< 3` chars or merge from server for consistency.

### 8.1 Proposed catalog file

`webapp/src/lib/search/featureCatalog.ts`:

```typescript
export const SEARCH_FEATURES = [
  { id: 'home', label: 'Home feed', keywords: ['home', 'feed'], href: '/' },
  { id: 'explore', label: 'Explore', keywords: ['explore', 'discover'], href: '/explore' },
  { id: 'trending', label: 'Trending', keywords: ['trending', 'hot'], href: '/trending' },
  { id: 'topics', label: 'Browse topics', keywords: ['topics', 'tags', 'categories'], href: '/topics' },
  { id: 'following', label: 'Following feed', keywords: ['following'], href: '/following' },
  { id: 'bookmarks', label: 'Bookmarks', keywords: ['bookmarks', 'saved'], href: '/bookmarks' },
  { id: 'reposts', label: 'Reposts', keywords: ['reposts'], href: '/reposts' },
  { id: 'squads', label: 'Browse squads', keywords: ['squads', 'communities'], href: '/squads' },
  { id: 'write', label: 'Write a story', keywords: ['write', 'blog', 'publish'], href: '/blogs/write' },
  { id: 'achievements', label: 'Achievements', keywords: ['achievements', 'badges', 'xp'], href: '/achievements' },
  { id: 'invite', label: 'Invite friends', keywords: ['invite', 'referral'], href: '/invite' },
  { id: 'settings', label: 'Settings', keywords: ['settings', 'account'], href: '/settings' },
  { id: 'help', label: 'Help center', keywords: ['help', 'support'], href: '/help' },
  { id: 'wallet', label: 'Wallet', keywords: ['wallet', 'credits'], href: '/wallet' },
  { id: 'pricing', label: 'Pricing', keywords: ['pricing', 'plans'], href: '/pricing' },
] as const;
```

### 8.2 Dual delivery strategy (fastest UX)

| Query length | Features source |
|--------------|-----------------|
| `< 3` | **Client-only** filter on `SEARCH_FEATURES` (instant) |
| `≥ 3` | Server includes `features` group (same catalog synced to Redis index) |

This gives **0ms feature hits** even before the API returns other groups.

---

## 9. Webapp UI (Phase 1)

### 9.1 Dialog sections

Replace flat user listbox with **grouped sections**:

```text
┌─ Command Palette ─────────────────────┐
│ > react hooks                         │
├───────────────────────────────────────┤
│ FEATURES                              │
│   Write a story                       │
│ POSTS                                 │
│   Understanding React Hooks — @jane   │
│ TAGS                                  │
│   #react   #hooks                     │
│ CATEGORIES                            │
│   Frontend                            │
│ SQUADS                                │
│   React Guild                         │
│ PEOPLE                                │
│   Jane Dev @jane                      │
└───────────────────────────────────────┘
```

- Flat keyboard index across all visible hits (preserve ↑/↓/Enter).
- Section headers not selectable.
- Footer: `tookMs` + total hits (dev) / `Matches: N` (prod).

### 9.2 Proposed file changes

```text
webapp/src/
  api/search.ts                    # searchApi.unified(q, types?)
  contracts/searchApi.ts           # UnifiedSearchResponse, SearchHit
  lib/search/featureCatalog.ts     # static features
  lib/search/normalizeQuery.ts     # trim, min chars guard
  components/search/
    SearchDialog.tsx               # grouped UI, min 3 chars
    SearchDialogWrapper.tsx        # unchanged
    SearchHitRow.tsx               # per-type row chrome
    SearchGroupSection.tsx
```

### 9.3 Navbar copy

Update button label to **"Search..."** or keep **"Search Stories..."** once blogs are included (Phase 3).

---

## 10. External libraries

### 10.1 Recommended stack

| Library | Where | Purpose | Phase |
|---------|-------|---------|-------|
| **`redis` ^4.7** | Server | Response cache + warm indexes | **Already installed** |
| **[FlexSearch](https://github.com/nextapps-de/flexsearch) ^0.7** | Server (Node) | Sub-5ms in-memory fuzzy/prefix on warm indexes (~5k docs) | **2** |
| **[FlexSearch](https://github.com/nextapps-de/flexsearch) ^0.7** | Webapp (optional) | Instant feature catalog filter offline | **1** (optional) |
| **MongoDB `$text`** | Server | Blog title/summary relevance | **3** |
| **[Meilisearch](https://www.meilisearch.com/)** | Sidecar | Sub-10ms full-text at 100k+ posts | **4** (optional) |

**Not recommended for v1:** Elasticsearch (ops heavy), Algolia (cost at scale), plain `RegExp` on full blog `content` JSON (too slow).

### 10.2 FlexSearch (Phase 2) — why

- **No separate service** — runs in Node beside existing Express app.
- **Microsecond–low-ms** search on a few thousand taxonomy/squad docs.
- Works on the JSON blobs stored in Redis; rebuild index on process start + Redis pub/sub invalidation.

```typescript
// server/src/services/search/flexIndex.ts (sketch)
import FlexSearch from 'flexsearch';

const tagIndex = new FlexSearch.Document({
  document: { id: 'id', index: ['label', 'tokens'] },
  tokenize: 'forward', // prefix-friendly
});

// hydrate from Redis search:index:tags once, searchTags(q) → index.search(q, { limit: 5 })
```

**Install (Phase 2):**

```bash
cd server && npm install flexsearch
# optional client bundle:
cd webapp && npm install flexsearch
```

### 10.3 Meilisearch (Phase 4) — when

Adopt if **all** of:

- Published posts **> 50k**, or
- p95 unified search **> 150ms** with Mongo `$text`, or
- Product needs typo tolerance + faceting on blogs.

Sync via worker on publish/unpublish (same pattern as gamification outbox).

---

## 11. Index invalidation & workers

| Event | Action |
|-------|--------|
| Post published / unpublished | Debounce rebuild `search:index:blogs:recent`; bust blog-related `search:result:*` via TTL only |
| Admin taxonomy CRUD | Rebuild tags/categories indexes; call `invalidateBlogTaxonomyCache()` |
| Squad create/update/delete | Rebuild squads index |
| Deploy (feature catalog change) | Re-seed `search:index:features` |

**Debounced rebuilder:** `server/src/services/search/searchIndex.worker.ts` — 30s coalesce, runs on gamification-style interval or queue.

---

## 12. Security & abuse

| Control | Implementation |
|---------|----------------|
| Min query length | 3 chars server + client |
| Rate limit | Redis `search:rl:{ip}:{minute}` — 30/min |
| Squad privacy | Only `visibility: 'public'` in index |
| Suspended posts | Exclude `status !== 'published'` and soft-deleted |
| Users | `isActive: true` only (existing) |
| No HTML in queries | Strip tags; max length 64 chars |

---

## 13. Implementation sprints

### Sprint 1 — Unified API shell + Redis cache + min 3 chars

- [ ] `GET /api/search` with parallel fan-out (regex Mongo paths)
- [ ] Redis `search:result:{qHash}` TTL cache
- [ ] `searchApi.ts` + update `SearchDialog` grouped UI
- [ ] Min 3 chars client + server
- [ ] Feature catalog client-side for `< 3` chars

### Sprint 2 — Redis warm indexes + FlexSearch

- [ ] `search:index:*` keys + rebuilder worker
- [ ] FlexSearch for tags, categories, squads, features
- [ ] `tookMs` + `cached` in response for observability

### Sprint 3 — Blogs in search

- [ ] Mongo `$text` index on title/summary
- [ ] Blog hits in unified response; rank by text score + recency
- [ ] Populate author username for `href`

### Sprint 4 — Polish

- [ ] Recent searches (localStorage, opt-in)
- [ ] Analytics: `search.query`, `search.select` with `type`
- [ ] Rate limiting middleware
- [ ] Evaluate Meilisearch vs metrics

---

## 14. Error handling

| Layer | Behavior |
|-------|----------|
| `q.length < 3` | No API; client features filter only |
| Redis down | Skip cache; Mongo fan-out still works |
| One entity fails | Return partial groups; log failed type |
| All fail | `500` + toast in dialog |
| Stale request | `requestIdRef` discard (keep existing pattern) |

---

## 15. File map

### Current (Phase 0)

```text
webapp/
  src/components/search/SearchDialog.tsx
  src/components/search/SearchDialogWrapper.tsx
  src/store/searchDialog.ts
  src/api/follow.ts
server/
  src/controllers/follow.controller.ts   # searchUsers
  src/routes/follow.routes.ts
```

### Target (Phase 1+)

```text
webapp/
  src/api/search.ts
  src/contracts/searchApi.ts
  src/lib/search/featureCatalog.ts
  src/lib/search/normalizeQuery.ts
  src/components/search/SearchDialog.tsx      # grouped
  src/components/search/SearchHitRow.tsx
  src/components/search/SearchGroupSection.tsx

server/
  src/routes/search.routes.ts
  src/controllers/search.controller.ts
  src/services/search/
    unifiedSearch.service.ts
    searchUsers.service.ts                    # extract from follow.controller
    searchTags.service.ts
    searchCategories.service.ts
    searchSquads.service.ts
    searchBlogs.service.ts
    searchFeatures.service.ts
    flexIndex.ts                              # Phase 2
    searchIndex.worker.ts                     # Phase 2
  src/shared/redis/keys.ts                    # search:* keys
```

---

## 16. Manual test checklist

### Phase 0 (today)

- [ ] Desktop/mobile/⌘K opens dialog; input focused
- [ ] User search returns ≤10 hits; Enter navigates to `/u/{username}`

### Phase 1+

- [ ] 1–2 chars: no API call; hint shown
- [ ] 3+ chars: unified request; grouped sections render
- [ ] Repeat query within 45s: `cached: true`, low `tookMs`
- [ ] Tags → `/topics/{slug}`; categories → `/topics/category/{slug}`
- [ ] Squads → `/squads/{slug}`; private squads never appear
- [ ] Blogs → `/blogs/{user}/{slug}`; drafts/suspended excluded
- [ ] Features match "bookmarks", "write", "achievements" instantly
- [ ] ↑/↓ crosses sections; Enter on correct href
- [ ] ESC / backdrop close without navigation
- [ ] Redis disabled: search still returns results (slower)

---

## 17. Distinctions (do not confuse)

| Surface | Path | Notes |
|---------|------|-------|
| **Navbar unified search** | `GET /api/search` (planned) | Public, multi-entity |
| **User mention autocomplete** | `GET /api/follow/search` | Editor only; keep separate |
| **Admin user search** | `/api/v1/admin/management/...` | Staff RBAC |
| **Topics page tag/category lists** | `/api/blog/tags/list`, `/api/blog/taxonomy/categories` | Paginated browse, not search palette |
| **Help CMS search** | `/api/v1/help/search` | Help articles only |

---

## 18. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `REDIS_URL` | Recommended | Cache + indexes; fail-open if unset |
| `SEARCH_CACHE_TTL_SEC` | Optional (default `45`) | Result cache TTL |
| `SEARCH_RATE_LIMIT_PER_MIN` | Optional (default `30`) | Per-IP cap |
| `MEILI_HOST` + `MEILI_MASTER_KEY` | Phase 4 only | External engine |

---

*Last updated: planning doc for unified navbar search (users + tags + categories + squads + blogs + app features) with Redis cache, 3-character minimum, and FlexSearch/Meilisearch upgrade path.*
