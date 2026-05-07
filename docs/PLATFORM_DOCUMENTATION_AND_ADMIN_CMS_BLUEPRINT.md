# Syntax Stories — Platform documentation, help center, and admin CMS blueprint

This document is the **single blueprint** for putting **product documentation**, **help pages**, **backend behavior**, and **public website pages** into one coherent system—specified at a **full production** bar: publishing safety, RBAC with resources and actions, operable config, background work off the request path, and hard admin boundaries. It is written so staff can update help articles, FAQs, and “what’s new” **without redeploying** the whole app, while **MongoDB pipelines stay versioned**, **API contracts stable**, **caching correct**, and **deployments** predictable.

### Document charter (canonical starting point)

- **This file is the standard spec** for the help/CMS **subsystem** and the **admin panel foundation** in a **production-grade** deployment. When you implement controllers, services, DTOs, and routes for help/admin, **start from the contracts and folder layout defined here** so public app, admin app, and API stay aligned.
- **Repository layout target:** one **shared Express API** (`server/`), one **public Next.js** app (`webapp/`), and a **separate admin Next.js** app (see §3 and §19)—same backend for auth, RBAC, and CMS APIs.
- Deep implementation details for unrelated domains remain in [Auth](./Auth.md), [Analytics](./Analytics.md), etc.; this doc owns **cross-cutting CMS + admin + help** decisions.

For day-to-day engineering detail, the repo already has focused guides (for example [Auth](./Auth.md), [Analytics](./Analytics.md), [Followers](./Followers.md)). This file ties those concerns together at the product and operations level.

---

## 1. Goals

| Goal | What it means |
|------|----------------|
| **One website** | Users read help and docs on the same domain and design system as the product (`webapp/`). |
| **Admin-editable** | Staff use a **dedicated admin Next.js app** (or equivalent) talking to the **same** Express API; non-engineers edit content; engineers own schema, DTOs, and guardrails. |
| **Stable APIs** | Public JSON is shaped by a **DTO layer** and **API version prefix** so CMS edits and schema drift do not break clients. |
| **Strict contracts** | **Never expose raw Mongoose documents** to the browser; always map DB → DTO with defaults for missing fields; **never `...doc`** on public responses (§4). |
| **Module isolation** | Help/CMS **business logic** lives in `help.service.ts`, not in unrelated product controllers—prepares you for different caching, scaling, and read-only APIs later (§4). |
| **Traceable logic** | Domain rules stay in `server/` services; HTTP stays thin in controllers. |
| **Pipeline safety** | Aggregations declare **pipeline / response version**; `system_config` is optional with **hardcoded fallbacks** and **audit fields** (§8.8). |
| **Enterprise CMS maturity** | **`help_article_versions`** (§8.2), **scheduled publish** (§8.3), **edit locks** (§8.4)—rollback, timed releases, no silent overwrites. |
| **Operational polish** | **Worker heartbeats** (§10.2), **idempotent** publish/rollback/schedule (§10.3)—avoid silent job death and duplicate writes. |
| **Cache-aware** | HTTP + Next.js caching with **invalidation on publish and on slug change** (§7). |
| **Safe operations** | Public help/search endpoints are **rate-limited**; seeds are **guarded** in production (§14, §15). |
| **Publishing safety** | **Draft vs live** separation with version counters so publish is a deliberate snapshot, not an overwrite of production (§8). |
| **SEO / canonical** | Every public article exposes **`canonicalPath`**; Next.js emits `<link rel="canonical">` to avoid duplicate-content issues across slug history (§7.5). |
| **Granular access** | **RBAC** uses **roles**, **resources**, **actions**, and optional **permission flags**; **user management** for staff is first-class (§9). |
| **Admin hardening** | Admin hostname protected at **infrastructure** layer (IP allowlist, Basic Auth, or SSO path)—not only API auth (§19.6). |
| **Async work** | Heavy or periodic work runs in **workers** / cron, not in HTTP request lifecycle (§14.8). |

---

## 2. Current repository map (facts)

These paths are the anchors for “where things live” today.

### 2.1 Frontend — public (Next.js App Router)

| Area | Path | Notes |
|------|------|--------|
| App routes | `webapp/src/app/` | Each folder is a URL segment (`page.tsx`, `layout.tsx`). |
| Example help | `webapp/src/app/help/sign-in/page.tsx` | Static copy today; replace with CMS + redirects when slugs move. |
| Landing, blog, profile, settings | `webapp/src/app/page.tsx`, `blogs/`, `u/[username]/`, `settings/`, etc. | Product surfaces. |
| Global styles | `webapp/src/app/globals.css` | Design tokens and retro UI. |

Env: `webapp/.env.example` (`NEXT_PUBLIC_*`).

### 2.2 Backend (Express + Mongoose)

| Area | Path | Notes |
|------|------|--------|
| HTTP API mount | `/api` | `server/src/bootstrap/registerApiRoutes.ts` → `server/src/routes/index.ts`. |
| Auth JSON API | `/auth` | `server/src/modules/auth/auth.routes.ts` — shared by public and admin apps. |
| Config | `server/src/config/env.ts` | `MONGO_CONN`, `REDIS_URL`, OAuth, JWT, ClamAV, etc. |
| Database | `server/src/config/database.ts` | `mongoose.connect` via `MONGO_CONN`. |

Route tables: [Auth.md §7](./Auth.md).

### 2.3 Developer markdown (`docs/*.md`)

Engineering runbooks stay in Git. **Customer-facing** help is stored in MongoDB and rendered by Next.js.

### 2.4 Target layout (implementation from this doc)

| Piece | Path (suggested) | Role |
|--------|------------------|------|
| Public site | `webapp/` | Users, help readers, marketing. |
| **Admin app** | `admin-webapp/` or `apps/admin/` (monorepo) | **Separate Next.js** — editors only; no product routes in this bundle. |
| API | `server/` | Single source of truth: `/api/v1/help/*`, `/api/v1/admin/help/*`, `/auth`. |
| Help module | `server/src/modules/help/` | Controllers, services, DTOs, mappers, model — **all help/CMS API work starts here** (§4). |

This is **module isolation**, not microservices: one process, one DB, clear boundaries so help traffic and caching policies can evolve independently later.

---

## 3. Information architecture: three layers + admin app

1. **Marketing / product pages** — mostly static; `webapp/src/app/`.

2. **In-app help** — MongoDB-backed articles; **public** JSON only via DTOs (`/api/v1/help/*`).

3. **Developer docs** — `docs/` in repo; optional internal wiki.

**Admin (foundation):** a **second Next.js application** deployed separately (subdomain e.g. `admin.example.com` or path on internal network). It uses the **same** `BACKEND_URL` / API for login and CMS mutations. **Security:** RBAC is **always** enforced on the server; the admin UI is never a trust boundary (§9, §19).

---

## 4. API and data contract layer + help module isolation

Help/CMS must not sprawl across random route files without a **service boundary**.

### 4.1 End-to-end layers

```
Public or admin Next.js
      ↓
HTTP: help.controller.ts (thin — status codes, parse query)
      ↓
help.service.ts (business rules: publish, slug redirect, ownership, pipeline version)
      ↓
help.mappers.ts → help.dto.ts (stable JSON only)
      ↓
help.model.ts / Mongoose (internal — never returned raw)
```

**Rules**

| Layer | Responsibility |
|--------|------------------|
| **Controller** | HTTP only: validate request shape, call service, send DTO JSON. |
| **Service** | All CMS vs product decisions for help: authorization checks, slug resolution, `system_config` read with fallbacks, orchestration. |
| **Model** | Schema and indexes; no response shaping here. |
| **Mapper** | DB document → DTO; the only place public field lists are assembled. |

**Product logic** (blog, follow, etc.) stays in its own modules. **Do not** put help business rules in `blog` services or global middleware.

### 4.2 Module folder layout (enforce this structure)

```
server/src/modules/help/
  ├── help.model.ts          # Mongoose schema
  ├── help.dto.ts            # Public types (and admin response types if distinct)
  ├── help.mappers.ts        # toHelpArticleDTO, toHelpListEnvelope — no spreading doc
  ├── help.service.ts        # getBySlug, listPublished, updateArticle, resolveSlugRedirect
  ├── help.controller.ts     # req/res handlers
  └── help.routes.ts         # Mount under /api/v1/help and /api/v1/admin/help
```

Wire `help.routes.ts` from `registerApiRoutes` (or a small `registerHelpRoutes(app)`). New help endpoints are added **inside this module** first.

### 4.3 Defensive DTO mapping (production-grade)

Manual mapping is already the right default. **Harden it:**

- **Do not** use `{ ...doc.toObject() }` or spread Mongoose documents into responses.
- **Do not** pass through dynamic keys from the DB.
- Optionally maintain a **comment or checklist** of allowed DTO fields in `help.mappers.ts` so code review catches leaks.

```ts
// Good: explicit keys only
return {
  slug: doc.slug,
  title: doc.title,
  summary: doc.summary ?? '',
  // ...
};

// Bad: accidental internal field leak
return { ...doc.toObject() };
```

### 4.4 DTO types and mapper example

```ts
// help.dto.ts — illustrative
export type HelpArticleDTO = {
  slug: string;
  canonicalPath: string; // e.g. `/help/${slug}` — §7.5
  title: string;
  summary: string;
  body: string;
  bodyFormat: 'markdown' | 'mdx' | 'richtext';
  category: string;
  tags: string[];
  updatedAt: string;
  publishedAt: string | null;
};
```

Optional: single-article response may include **`redirectTo`** when the requested slug is in `slugHistory` (see §7.4, §8). Always set **`canonicalPath`** from the **current** slug, not the requested path.

---

## 5. API versioning and versioned response envelope

### 5.1 URL versioning

- `GET /api/v1/help/articles`
- `GET /api/v1/help/articles/:slug`

Temporary alias `/api/help/*` → `v1` until clients migrate.

### 5.2 Response envelope (lists)

```json
{
  "version": 2,
  "listPipelineVersion": 2,
  "data": [ { "...": "HelpArticleDTO" } ]
}
```

### 5.3 Deployment backward compatibility (mandatory rule)

**Rule:** the **backend must remain backward compatible for at least one API `version`** while any client (public or admin) still on the previous build.

- Prefer: ship **backend** that accepts old + new shapes (dual read) → deploy **frontends** → remove legacy paths.
- Avoid: deploying backend that returns `version: 2` only while a frontend still assumes `version: 1` with no branch.

Document each breaking envelope change in `docs/migrations/` and coordinate release order in your runbook (§13).

### 5.4 Public vs admin API surface (reduce coupling)

| Prefix | Stability expectation | Who calls it |
|--------|-------------------------|--------------|
| **`/api/v1/help/*`** | **High** — version slowly; backward compatible per §5.3; DTOs are stable. | Public `webapp`, SEO crawlers, embeds. |
| **`/api/v1/admin/help/*`** | Can evolve **faster** with admin releases — still version admin payloads, but breaking changes here **must not** break the public app. | `admin-webapp` only. |

**Rule:** never ship a change to **public** help DTOs solely because the admin UI wants a new field—extend admin responses or add optional fields with defaults on the public mapper.

---

## 6. Content rendering strategy

| Format | Recommendation |
|--------|----------------|
| **Markdown** | **Default** — `remark` / `rehype`, whitelist nodes, sanitize HTML. |
| **MDX** | Defer; security review if added. |
| **Rich text** | Store canonical JSON + fixed renderer components when editors need WYSIWYG. |

### 6.5 CMS content and publish validation (quality gates)

Schema validation (Zod) is not enough—**editorial quality** needs rules before **publish**:

| Check | Example rule | On failure |
|-------|----------------|------------|
| Title | Non-empty, max length | 400 with field error |
| Body | Min length for **published** (e.g. ≥ 50 chars); allow shorter **drafts** | Block publish, allow save draft |
| Summary | Optional but recommended for SEO | Warning in admin UI; optional hard block |
| Markdown | Optional: lint in CI or pre-publish warning | Non-blocking initially |

**Publish** should call a dedicated `assertPublishable(doc)` in **`help.service.ts`** so incomplete content cannot go live. Preview mode reads **draft** with a **preview token** (admin-only), not the live snapshot.

---

## 7. Caching and invalidation

### 7.1 HTTP caching (Express)

Public published help: e.g. `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Drafts/admin: `no-store`.

### 7.2 Next.js `fetch` caching

```ts
fetch(url, { next: { revalidate: 60 } });
```

### 7.3 On-demand revalidation (publish / unpublish)

On publish or archive: `revalidatePath('/help')`, `revalidatePath('/help/' + slug)`, and call your secured revalidation endpoint with `REVALIDATE_SECRET`.

### 7.4 Slug-change cache busting (critical)

When a **slug changes**, edge and browser caches may still serve **old paths** (stale 404, wrong page, or outdated ISR).

**Always:**

1. **Revalidate all affected paths** in the public Next.js app:
   - `/help`
   - `/help/<new-slug>`
   - `/help/<each-old-slug>` that moved to `slugHistory` for that article (at minimum the **immediate** previous slug; ideally every path you still serve).

2. **API behavior:** for `GET /api/v1/help/articles/:slug`, if `slug` matches a **historical** slug, return a DTO that includes **`redirectTo: '/help/new-slug'`** (or HTTP 301/308 from a dedicated redirect route—pick one strategy and document it).

3. **Public webapp:** if the client receives `redirectTo`, issue `redirect(redirectTo)` (Next.js `redirect()`) so users and bots converge on the canonical URL.

Order: update DB (slug + `slugHistory`) → **revalidate** old + new + hub → then rely on API `redirectTo` for any straggling requests.

### 7.5 Canonical URL enforcement (SEO)

Duplicate URLs (`/help/old-slug` vs `/help/new-slug`) hurt SEO if both return 200 with the same body.

**API:** every public **`HelpArticleDTO`** includes:

```ts
canonicalPath: string; // e.g. `/help/${currentSlug}` — always the current slug, not the requested path
```

**Next.js (public `webapp`):**

```tsx
<link rel="canonical" href={`${siteOrigin}${article.canonicalPath}`} />
```

Combine with **`redirectTo`** for legacy slugs so users and bots consolidate on **`canonicalPath`**.

---

## 8. Admin CMS — recommended data model (MongoDB)

### 8.1 Publishing system (draft vs live — not just a status flag)

`draft → published → archived` is necessary but **not sufficient** for production editorial safety. Without **draft vs live separation**, editors can **overwrite live content instantly** or publish incomplete work.

**Recommended model**

| Concept | Purpose |
|---------|---------|
| **`status`** | Workflow: `'draft' \| 'published' \| 'archived'`. |
| **`isPublished`** | Denormalized or derived: there is a live snapshot readers see. |
| **`draftVersion`** | Monotonic counter incremented on each **draft** save. |
| **`publishedVersion`** | Monotonic counter incremented on each **publish** event (successful snapshot to live). |

**Publish = snapshot:** on publish, copy validated draft fields into the **live** fields (or into `publishedSnapshot` subdocument) and increment `publishedVersion`. **Persist** each live snapshot to **`help_article_versions`** (§8.2)—do **not** grow an unbounded embedded array on `help_articles` (MongoDB **16MB document limit**).

**Rollback:** restore live fields from a chosen version row in **`help_article_versions`** (admin action) or re-publish from draft—see §8.2.

**Preview:** `GET` draft with **preview token** (admin) returns draft body; public never sees draft without token.

This separates “CMS” from a **publishing system** with **auditable history**, not only version counters.

### 8.2 Published content version history (real rollback + audit)

Counters alone (`draftVersion`, `publishedVersion`) do not let you **restore** old text. You need stored snapshots—but **not** as an unbounded embedded array on `help_articles`.

#### 8.2.1 Document size risk (16MB hard limit)

MongoDB caps a single document at **16MB**. Large Markdown bodies × many versions in `publishedHistory[]` **will** eventually blow this limit and break writes.

**Rule:** keep **`help_articles`** lean: **latest live fields + metadata only**. Store full version bodies in a **separate collection**.

#### 8.2.2 Collection: `help_article_versions` (recommended)

One document per immutable snapshot (append-only):

| Field | Type | Purpose |
|-------|------|---------|
| `articleId` | ObjectId | Ref to `help_articles._id`. |
| `version` | number | Matches `publishedVersion` at time of snapshot (unique per `articleId`). |
| `title`, `summary`, `body`, `bodyFormat` | … | Snapshot of **live** content at publish. |
| `createdAt` | Date | When snapshot was written. |
| `publishedBy` | ObjectId? | Staff who triggered publish. |

**Indexes:** `{ articleId: 1, version: -1 }`, `{ articleId: 1, createdAt: -1 }`.

**Flow**

- On each successful **publish**, **insert** a new row in `help_article_versions` (after or before updating live fields—document your ordering for audit).
- **Rollback:** `POST .../rollback` with `targetVersion` loads that row, copies fields to live, increments `publishedVersion` (and optionally inserts a new version row marking rollback—your audit policy).
- Optional: TTL or archival job for very old versions to control storage cost.

**Embedded array alternative:** only acceptable for **strictly capped** tiny snippets (e.g. last 3 summaries)—not full bodies at scale.

**Why separate collection:** avoids 16MB failures, keeps **main reads fast** (single small `help_articles` doc), aligns with how mature CMS backends store revision history.

### 8.3 Scheduled publishing

Manual publish is not enough for announcements, releases, and timed go-live.

| Field | Type | Purpose |
|-------|------|---------|
| `publishAt` | `Date \| null` | When the article should **automatically** go live (`isPublished`, snapshot, revalidation). |

**Worker** (§10.1): on an interval (e.g. every minute), query articles where `publishAt != null`, `publishAt <= now`, `!isPublished`, `status === 'draft'` (or `scheduled`), then run the same **`publish()`** path as manual publish (including **§6.5** validation—if validation fails, mark `scheduleFailedAt` + notify).

**API:** `PATCH` with `publishAt` for editors with **`publish`** permission; clear `publishAt` to cancel schedule.

### 8.4 Edit locking (editor collision)

Two editors opening the same article can **overwrite** each other’s work silently.

| Field | Type | Purpose |
|-------|------|---------|
| `lockedBy` | `ObjectId \| null` | User holding the edit lock. |
| `lockedAt` | `Date \| null` | When lock was taken. |

**Behavior**

- **Acquire lock:** `POST /api/v1/admin/help/articles/:id/lock` — set `lockedBy`, `lockedAt` if unset or lock **expired**.
- **Heartbeat / renew:** optional `PATCH .../lock` every ~2 min while editor has doc open.
- **Expire:** if `now - lockedAt > 5–10 minutes` (configurable), lock is stale—next editor may steal lock or acquire after expiry.
- **Release:** `DELETE .../lock` on navigate away, or rely on expiry.
- **Conflict:** if lock held by another user, return **409** with `{ lockedBy, lockedAt, expiresInSec }`.
- **Admin override:** `canForceUnlock` or **admin** role may clear lock (logged to `admin_audit`).

Admin UI should show **read-only** or **override** UX when 409.

### 8.5 Collection: `help_articles` (fields)

| Field | Type | Purpose |
|-------|------|---------|
| `slug` | string, unique | Current canonical URL segment. |
| `slugHistory` | string[] | Prior slugs → redirects + §7.4 invalidation. |
| `title`, `summary`, `body`, `bodyFormat`, `category`, `tags` | … | **Live** content after publish (what public DTOs map). |
| `draftTitle`, `draftSummary`, `draftBody`, … | optional | **Working copy** while editing; or single `draft` subdocument. |
| `status` | `'draft' \| 'published' \| 'archived' \| 'scheduled'` | Include **`scheduled`** if `publishAt` set and not yet live (optional enum value). |
| `isPublished` | boolean | Whether a live snapshot is exposed. |
| `draftVersion` | number | Increment on draft save. |
| `publishedVersion` | number | Increment on each publish. |
| Version bodies | — | Store in **`help_article_versions`** (§8.2), **not** a huge embedded array on this doc. |
| `publishAt` | `Date \| null` | §8.3 — scheduled go-live. |
| `lockedBy`, `lockedAt` | ObjectId / Date | §8.4 — edit lock. |
| `publishedAt`, `updatedAt` | Date | Live metadata. |
| `authorId` | ObjectId | Ownership (§9). |
| `seo` | object | `metaTitle`, `metaDescription`; align with **canonical** (§7.5). |
| `contentSchemaVersion` | number | Body / rich-text shape migrations. |

### 8.6 Slug lifecycle

On slug change: append old slug to `slugHistory`; §7.4 revalidation; **`canonicalPath`** uses **current** `slug`; historical slugs return **`redirectTo`**.

### 8.7 `site_strings` (optional)

Microcopy: `key`, `value`, optional `locale`.

### 8.8 `system_config` — fallbacks + audit trail

Same fallback discipline as before (**code defaults** if DB missing), **plus** treat config as **operational data** that must not change without trace:

| Field | Purpose |
|-------|---------|
| `configVersion` | Monotonic integer bumped on each logical config change. |
| `updatedAt` | Last mutation time. |
| `updatedBy` | `ObjectId` of staff user (or system). |

Log config reads that **used fallback** at warn level. Optionally append to **`admin_audit`** or a small `config_change_log` for diffs.

```ts
const DEFAULT_HELP_LIST_PIPELINE_VERSION = 1;

async function getHelpListPipelineVersion(): Promise<number> {
  try {
    const doc = await SystemConfig.findOne({ key: 'global' }).lean();
    const v = doc?.helpListPipelineVersion;
    return typeof v === 'number' && v >= 1 ? v : DEFAULT_HELP_LIST_PIPELINE_VERSION;
  } catch {
    return DEFAULT_HELP_LIST_PIPELINE_VERSION;
  }
}
```

### 8.9 API sketch

- `GET /api/v1/help/articles` — public list + envelope (**live** only).
- `GET /api/v1/help/articles/:slug` — public detail, **`canonicalPath`**, or **`redirectTo`**.
- `POST|PATCH /api/v1/admin/help/articles` — **RBAC + permissions + ownership** (§9); respect **lock** (§8.4).
- `POST|DELETE .../articles/:id/lock` — acquire / release edit lock.
- `POST .../publish` — manual publish after **§6.5**; or worker uses same service method when **`publishAt`** fires (§8.3).
- `POST .../rollback` — restore from **`help_article_versions`** for `targetVersion` (§8.2), **admin** or **`help:article` + `rollback`** permission; **idempotent** (§10.4).
- Internal: `POST` revalidation webhook with secret.

### 8.10 Optional high-ROI enhancements (next)

| Enhancement | Field / behavior | Why |
|-------------|------------------|-----|
| **Related articles** | `relatedArticles: ObjectId[]` | “You might also like”, navigation, better **resolved** signals. |
| **A/B or variants** | `variant: 'A' \| 'B'` (or experiment id) | Compare engagement; version analytics. |
| **Search synonyms** | `searchSynonyms: string[]` on article or global synonym map | Map “login issue” ↔ “sign in”; improves findability beyond raw text match. |
| **Diff-based history** | Store patches / diffs between versions instead of full body every time | Storage optimization **after** separate `help_article_versions` is healthy. |
| **Approval workflow** | `status: draft → review → approved → published` | Editorial gates before live. |
| **Per-article performance** | Admin UI dashboard: views, **resolved** vs **exit** rate (§12) | Data-driven rewrites without leaving CMS. |

---


## 9. Role-based access control (RBAC), permissions, and user management

Authorization is **always enforced on the server** (JWT/session + checks below). The admin UI only reflects what the API allows.

### 9.1 Model: roles, resources, actions, and permission types

**Roles** are coarse groupings for UX and defaults. **Fine-grained control** uses **resource + action** checks (and optional boolean flags for common toggles).

| Concept | Meaning | Example |
|---------|---------|---------|
| **Resource** | What object class is being accessed | `help:article`, `help:config`, `cms:site_string`, `admin:user`, `system:config` |
| **Action** | What operation | `read`, `create`, `update`, `delete`, `publish`, `archive`, `preview`, `rollback`, `forceUnlock`, `invite`, `suspend` |
| **Role** | Named bundle of allowed (resource, action) pairs | `user`, `editor`, `admin`, `reviewer` (optional) |
| **Permission flags** (optional) | Product-specific booleans on the staff record | `canPublish`, `canDelete`, `canManageUsers` — use when “all editors are equal” is false |

**Default role matrix (illustrative — tune in code)**

| Role | Typical resources / actions |
|------|-----------------------------|
| **user** | No admin routes; public `help:read` only (implicit). |
| **editor** | `help:article` → `create`, `update`, `read`; `publish` only if `canPublish` or role includes it. |
| **reviewer** (optional) | `help:article` → `read`, `update` (comments/suggestions only) — no `publish` without flag. |
| **admin** | All `help:*`, `cms:*`, `admin:user` invite/suspend, `system:config` read/update. |

**Enforcement pattern**

```ts
function can(user: AuthUser, resource: string, action: string): boolean {
  // Resolve from role defaults + user.permissionOverrides + flags
}
```

Use **`requirePermission('help:article', 'publish')`** middleware after `verifyToken`.

### 9.2 Ownership vs global permissions

Use **`authorId`** on `help_articles` for **ownership**:

- If **`canEditOthers`** is false (default for junior editors): `editor` may only `update`/`delete` where `doc.authorId === user.id`.
- **admin** or users with **`canEditAllArticles`** bypass ownership.

```ts
if (user.role === 'editor' && !user.canEditAllArticles && String(doc.authorId) !== String(user.id)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

Document whether your product uses **shared pool** editing (any editor edits any article).

### 9.3 User management (staff)

Production admin needs **lifecycle**, not only roles:

| Concern | Practice |
|---------|----------|
| **Invite** | Admin creates staff user or sends invite link; first login sets password / OAuth link. |
| **Suspend / offboard** | `suspendedAt` or `status: 'disabled'` on staff; **invalidate sessions** and block JWT refresh. |
| **Audit** | Who granted `admin`, who published, who changed `system_config` — store in `admin_audit` (§16). |
| **Least privilege** | Default new staff to **editor** without `publish` until promoted. |

Staff may live on **`User`** with `isStaff: true` or a dedicated **`Staff`** / `RoleAssignment` collection if you need multiple roles per user later.

### 9.4 Middleware stack (order)

1. `verifyToken` (or session).
2. `requirePermission(resource, action)` or `requireRole` for coarse routes.
3. Ownership check inside **service** for `PATCH`/`DELETE` on articles.

Revalidation and preview: **`publish`** permission or **admin-only** secret routes.

---

## 10. MongoDB pipeline versioning

1. Resolve pipeline version via **`getHelpListPipelineVersion()`** (§8.8), not scattered literals.
2. Include `listPipelineVersion` in list aggregation output and in the JSON envelope.
3. On breaking pipeline changes: follow **§5.3** backward compatibility.

### 10.1 Why not run everything in the request?

These **must not** run inline in a single HTTP request at scale:

- Help **analytics rollups** / aggregates
- **Search** index sync (Atlas Search or rebuild hooks)
- **Trending** / other pipelines (see existing roadmap docs)
- **Cleanup** (TTL companions, orphaned drafts)
- **Scheduled publish** — poll/query `publishAt <= now` and call **`publish()`** (§8.3); keep interval short enough for your SLA (e.g. 1 min)

**Pattern:** `server/src/workers/` (or `server/src/jobs/`) with schedulers:

```
server/src/workers/
  ├── helpScheduledPublish.worker.ts
  ├── helpAnalyticsRollup.worker.ts
  ├── helpSearchSync.worker.ts   # if you sync to Atlas Search externally
  └── index.ts                  # register cron / queue consumer
```

**v1:** `node-cron` or host **cron** calling a CLI `npm run worker:help-analytics`. **v2:** BullMQ + Redis when volume demands it. Workers share **Mongoose models** and **service** functions—no duplicate business logic in scripts.

### 10.2 Worker reliability and observability (silent failure risk)

If a worker process **crashes** or stops scheduling, **scheduled publish**, analytics rollups, and search sync **stop**—often **without** a user-visible error.

**Fix:** persist **worker heartbeat** / last successful run:

| Approach | Example |
|----------|---------|
| **Collection** `worker_status` | `{ name: 'scheduled_publish', lastRunAt: Date, lastSuccessAt?: Date, lastError?: string }` |
| **Heartbeat** | Update `lastRunAt` at **start** and `lastSuccessAt` at **end** of each tick. |

**Monitor:** alert if `now - lastSuccessAt > threshold` (e.g. **2 minutes** for a 1-minute scheduled-publish worker). Same pattern for other jobs.

Log structured errors; restart workers via **process manager** (pm2, systemd, k8s) with **restart policy**.

### 10.3 Idempotency (publish, rollback, scheduled publish)

Network retries, double-clicks, or worker redelivery can invoke **publish** or **rollback** twice.

**Risk:** duplicate version rows, double increment of `publishedVersion`, or corrupted live state.

**Patterns**

| Operation | Idempotency approach |
|-----------|------------------------|
| **Publish** | Client sends **`expectedDraftVersion`** or **`If-Match: publishedVersion`**; server only applies if current doc matches; else **409**. |
| **Rollback** | Require **`targetVersion`** + **`expectedPublishedVersion`** (current); no-op if already at target. |
| **Scheduled worker** | Use **atomic** find-and-update: e.g. `findOneAndUpdate` where `publishAt <= now` and `status === 'scheduled'` and **not already published**; or **`idempotencyKey`** per scheduled run stored in Redis with TTL. |
| **HTTP** | Optional **`Idempotency-Key`** header (Stripe-style) for admin mutations. |

Implement **`publish()`** so calling it twice with the same preconditions is a **no-op** or returns the same result.

### 10.4 Example: versioned list aggregation (inline with pipeline version)

```javascript
const LIST_PIPELINE_VERSION = 2; // align with envelope listPipelineVersion

db.help_articles.aggregate([
  { $match: { status: 'published', isPublished: true } },
  { $sort: { publishedAt: -1 } },
  { $limit: 50 },
  { $addFields: { listPipelineVersion: LIST_PIPELINE_VERSION } },
]);
```

---

## 11. Search

### 11.1 Mechanisms

| Approach | When |
|----------|------|
| **Atlas Search** | Best relevance and scale. |
| **`$text` + text index** | Self-hosted MongoDB fallback. |

### 11.2 Ranking strategy (required for good UX)

Bad ranking feels like “search is broken” even when indexing works.

**v1 policy — match quality by field weight:**

- **Title** matches rank **above** summary **above** body.
- Tie-break: `publishedAt` descending or static relevance score.

**Atlas Search:** define indexes with **higher weights** on `title` than `summary` than `body` (exact boost syntax depends on Atlas index definition; treat as product config and version it when you change weights).

**`$text`:** default text score is one dimension; you can **`$addFields`** with custom weights if you use separate `$text` clauses per field or a compound strategy—document the chosen approach in code comments.

Expose `GET /api/v1/help/search?q=` with DTOs and optional `searchResponseVersion` when ranking logic changes.

---

## 12. Analytics for help content

| Event | Purpose |
|-------|---------|
| **view** | Popular articles. |
| **search** | Query terms; content gaps. |
| **zero_result** | Failed searches → new articles. |
| **exit** | User left help quickly — weak signal for confusion (aggregate only). |
| **resolved** | **Success signal** — user likely found an answer (e.g. clicked “related” after reading, stopped searching after dwell, or explicit “this helped” if you add UI). Use to find **high-performing** vs **misleading** articles. |

Example body for `POST /api/v1/help/track` (rate-limited):

```json
{
  "type": "view" | "search" | "zero_result" | "exit" | "resolved",
  "slug": "sign-in",
  "query": "optional",
  "dwellMs": 0
}
```

**Exit** / **resolved**: emit from public webapp with privacy-safe heuristics (no PII). **Resolved** is intentionally softer than a support ticket resolution—tune thresholds in product.

---

## 13. Deployment, schema-change risk, and release order

1. **DTO defaults** (§4) — absorb nulls.
2. **API versioning** — `/api/v1` vs `/api/v2` for breaking DTOs.
3. **Envelope `version`** — client branching during migrations.
4. **Backward compatibility** — **§5.3**: backend supports old clients one version.
5. **Order:** backend compatible → deploy admin + public apps → remove dead branches.

---

## 14. Production setup (detailed checklist)

### 14.1 Topology

| Component | Role |
|-----------|------|
| **Next.js public** (`webapp`) | Users + help readers; ISR + §7 invalidation. |
| **Next.js admin** (`admin-webapp/`) | Staff only; same API; separate deploy (§19). |
| **Express** (`server`) | All JSON; **help module** isolated under `modules/help`. |
| **MongoDB**, **Redis** | Data + sessions/rate limits. |

### 14.2 Environment variables

**Server:** `server/.env.example` patterns; add **`ADMIN_FRONTEND_URL`** (or comma-separated in `FRONTEND_URL`) if admin origin must be CORS-allowed separately.

**Public webapp:** `NEXT_PUBLIC_API_BASE_URL` (include or document `/api/v1` base path).

**Admin webapp:** e.g. `NEXT_PUBLIC_API_BASE_URL` pointing at same API origin; no need to expose admin-only secrets in the browser beyond what `/auth` already uses.

**Revalidation:** `REVALIDATE_SECRET` shared between server hook and both Next apps if both trigger revalidation.

### 14.3 Networking and security

HTTPS, HSTS, CORS for **both** public and admin origins, secure cookies, `trust proxy` aligned with load balancer.

### 14.4 Atlas / ops

Backups, indexes, staging ≈ prod Mongo version.

### 14.5 Deployment flow

Build both Next apps + run API; health check `/api/health`.

### 14.6 Observability

Logs, Sentry, uptime; dashboards for help search zero-results, **exit** vs **resolved** rates once events exist. **Worker health:** alert on stale **`worker_status.lastSuccessAt`** (§10.2).

### 14.7 Rate limiting — public help and search

Help and search are **scrapeable** and cheap to abuse. Apply **named** rate limits (you already use Redis-backed limits elsewhere):

| Route pattern | Suggested starting point |
|---------------|---------------------------|
| `GET /api/v1/help/articles`, `GET .../:slug` | e.g. 100 req/min/IP (tune per CDN) |
| `GET /api/v1/help/search` | stricter (e.g. 30/min/IP) — expensive |
| `POST /api/v1/help/track` | moderate (e.g. 60/min/IP) — prevent spam events |

Admin **`/api/v1/admin/help/*`** uses **authenticated** limits (higher) plus RBAC.

### 14.8 Background jobs and workers

See **§10.1**–**§10.3**. In production, ensure the process manager or platform runs **worker** entrypoints (or system cron) so analytics rollups, search sync, and cleanup **do not** block user requests. Persist **`worker_status`** and alert on stale runs (**§10.2**). Implement **idempotent** job handlers (**§10.3**).

---

## 15. Seeding and migration strategy

### 15.1 Safety guard (production)

Seeds **must not** overwrite production editorial content by accident.

- **Default:** refuse to run if `NODE_ENV === 'production'` **unless** `SEED_HELP_FORCE=true` or CLI `--force` is passed explicitly.
- Log every upsert when force is used.

```ts
if (process.env.NODE_ENV === 'production' && !process.env.SEED_HELP_FORCE) {
  throw new Error('Seeding disabled in production. Set SEED_HELP_FORCE=1 to proceed.');
}
```

### 15.2 Static → CMS

Script `server/src/scripts/seed-help.ts` with idempotent upserts; after seed, run §7.3 revalidation; replace static `help/*` pages when parity is verified.

Document migrations under `docs/migrations/`.

---

## 16. Suggested addons (prioritized)

| Addon | Notes |
|-------|--------|
| Atlas Search | §11; version index when `contentSchemaVersion` changes; pair with **§8.10** synonyms. |
| CDN + edge cache | Invalidate on publish, schedule go-live, and slug change (§7.4). |
| Admin audit log | `admin_audit` for CRUD, publish, **rollback**, **force-unlock**. |
| Preview tokens | Draft preview URLs. |
| Related / A/B / synonyms | See **§8.10** when ready. |
| i18n | `locale` on articles + `site_strings`. |
| Status page | Incidents. |

---

## 17. Implementation order (bootstrap from this doc)

1. **Scaffold** `server/src/modules/help/` — models (**§8.1–§8.5** + **`help_article_versions`** §8.2), `help.dto.ts` (**`canonicalPath`**), `help.mappers.ts`, `help.service.ts` (**idempotent** `publish`, `rollback`, lock acquire/release — §10.3), `help.controller.ts`, `help.routes.ts`.
2. **Mount** routes per **§5.4**: `/api/v1/help/*` (stable) and `/api/v1/admin/help/*` with **RBAC** (§9), **rate limits** (§14.7).
3. **`system_config`** reader with **defaults + audit** (§8.8).
4. **Slug + canonical** — `redirectTo`, **`canonicalPath`**, §7.4 revalidation, `<link rel="canonical">` in `webapp`.
5. **Public webapp** — `help/[slug]`; admin **§19.6** hardening when deploying admin host.
6. **Admin Next.js** — skeleton (§19); **publish**, **schedule**, **lock** UX, **rollback** from history.
7. **Workers** (§10.1) + **`worker_status`** (§10.2) + **idempotent** handlers (§10.3): **scheduled publish** + rollups / search sync when traffic warrants.
8. **Search** + **ranking** (§11.2).
9. **Analytics** — view, search, zero_result, exit, **resolved** (§12).
10. **Seed script** with production guard (§15.1).

---

## 18. If you fix only five things first

1. **Help module** — `help.service` + explicit DTO mappers (no spread) + **`canonicalPath`**.  
2. **Publishing** — draft vs live, **`publishedVersion`**, **`help_article_versions`** (§8.2), idempotent **publish/rollback** (§10.3), validate before publish (§6.5, §8.1).  
3. **Caching** — publish **and** slug-change invalidation (§7.4).  
4. **RBAC** — resources/actions + **staff user management** (§9).  
5. **API split + compatibility** — §5.4 + §5.3 deploy order.

---

## 19. Admin frontend — separate Next.js, same backend

This is the **admin panel foundation** referenced in the charter: **not** a route group inside `webapp/`, but a **second Next.js project** so you get a smaller bundle, clearer access control at the edge (separate deploy, IP allowlist, or SSO later), and no accidental mixing of user and staff UI.

### 19.1 Why separate apps

| Concern | Benefit |
|---------|---------|
| **Security** | Smaller surface; staff-only deploy policies; optional VPN / IP restrictions on admin host only. |
| **RBAC** | Still enforced **only on the server**; admin UI never decides authorization. |
| **Scaling** | Different cache headers, no product feature code in admin chunks. |
| **UX** | Editor-focused layout without polluting public `webapp`. |

### 19.2 How it connects

- **Same Express API:** `POST /auth/login`, refresh, and `PATCH /api/v1/admin/help/articles/:id` against **`BACKEND_URL`** (or `NEXT_PUBLIC_API_BASE_URL` in admin).
- **Same JWT/session model** as the public app if your auth stack already issues Bearer tokens — admin stores tokens the same way (prefer **httpOnly** cookies if you add them later; until then follow existing client patterns from `webapp`).
- **CORS:** allow the **admin origin** in server config (`ADMIN_FRONTEND_URL` or extra entry in `FRONTEND_URL` comma list).

### 19.3 What the admin app does *not* do

- It does **not** duplicate business rules; all publish/slug/ownership checks stay in **`help.service.ts`**.
- It does **not** expose new public routes without the same DTO and versioning rules.

### 19.4 Suggested `admin-webapp` layout

```
admin-webapp/
  src/app/
    login/
    help/
      page.tsx           # list
      [id]/edit/page.tsx # editor
  src/lib/api.ts         # fetch with auth header
```

Use the same design system packages as `webapp` if you want visual consistency (shared `packages/ui` optional).

### 19.5 Where implementation starts

| Layer | Start here |
|-------|------------|
| API contracts | §4, §5, §8 |
| Server code | `server/src/modules/help/*` + route registration |
| Public UI | `webapp/src/app/help/` |
| Admin UI | new `admin-webapp/` (or monorepo `apps/admin`) |

### 19.6 Admin access boundary (infrastructure — not optional in production)

API RBAC is necessary but **not sufficient**: the **admin hostname** should not be a wide-open login page on the public internet without extra friction.

| Layer | Options (pick at least one for production) |
|-------|---------------------------------------------|
| **Network** | IP allowlist (office/VPN), private VPC, Cloudflare Access, Tailscale |
| **Edge** | HTTP Basic Auth in front of `admin.*` (shared team secret — weak alone, OK + SSO later) |
| **Identity** | SSO (Google Workspace, Okta) on admin app only |
| **Rate limit** | Stricter login throttling on `/auth` **from admin origin** (track `Origin` / client id) |

**Rule:** assume **credential stuffing** against admin login; combine **network or SSO** with strong RBAC and audit (§9.3).

---

## 20. From help CMS toward a content platform

The module layout in this doc supports evolution beyond “help articles”:

| Today | Tomorrow (same patterns) |
|-------|-------------------------|
| Help articles | Blogs, changelogs, legal pages in CMS |
| Keyword search | Semantic / vector search (new index + worker) |
| Scheduled publish (§8.3) | Approval workflows, multi-stage review |
| Single locale | `locale` on documents + `site_strings` |

**Keep boundaries:** one **`help`** (or rename to **`content`**) module per surface, shared **DTO** discipline, **workers** for anything heavy.

---

## 21. Full production posture — summary

This spec is **strong enough** to ship a real admin CMS, scale traffic, and grow the team **if** you implement: **publishing snapshots** (§8.1), **`help_article_versions`** (§8.2), **scheduled publish** (§8.3), **edit locking** (§8.4), **canonical URLs** (§7.5), **granular RBAC + staff lifecycle** (§9), **workers** + **heartbeats** (§10.1–§10.2, §14.8), **idempotency** on mutations (§10.3), **admin infra boundary** (§19.6), **public vs admin API split** (§5.4), **config audit** (§8.8), and **content validation** (§6.5).

### Architecture maturity (plain terms)

| Layer | Status when implemented as written |
|-------|--------------------------------------|
| API contracts / DTOs | Strong |
| CMS data model | Production-grade + **`help_article_versions`**, **schedule**, **locks** |
| Publishing | **Enterprise-grade** with rollback from version collection (not 16MB-unsafe arrays) |
| RBAC | Scalable (resources / actions) |
| Caching + SEO | Correct (invalidation + canonical) |
| Admin | Separated + infra boundary |
| Async processing | Workers + **scheduled publish** + **heartbeats** + **idempotent** jobs |

**Three structural pillars for enterprise-grade CMS behavior:** **§8.2** version store (separate collection), **§8.3** `publishAt` worker, **§8.4** collision locks—plus **§10.2–§10.3** so jobs and retries don’t corrupt data.

**Earlier “last-mile” checklist (still relevant):**

1. **Draft vs live + `publishedVersion` + `help_article_versions`** — accidental overwrites + **real** rollback.  
2. **`canonicalPath` + `<link rel="canonical">`** — SEO + slug history.  
3. **Permissions** + **staff user management**.  
4. **Workers** — analytics, search sync, **scheduled publish**, **monitored** (§10.2).  
5. **Admin** behind VPN / Access / SSO + stricter login limits.

At this point the design crosses from “shipping a feature” to **designing a modular content platform**—same module boundaries, stricter editorial safety.

### Verdict: features are specified — what’s left is execution and ops

You are **not** missing major product features in this document. What remains is **implementation quality**, **monitoring**, and **edge-case handling** (16MB, worker death, duplicate requests).

**Industry comparison (conceptual, not literal stacks):** the patterns here overlap what you see behind serious **docs sites**, **Medium-style** publishing, **Notion**-class snapshot semantics, and **internal SaaS CMS**—separate read model, versioned history, scheduled jobs, RBAC, canonical URLs.

| Stage | Where you are |
|-------|----------------|
| Beginner “single CRUD page” | Not the target |
| Intermediate feature build | Behind you (on paper) |
| Advanced production API design | ✔ |
| System-level content platform | ✔ (spec) |

### What to build next (stop expanding the spec)

**Execution mistakes now matter more than design gaps.** Recommended order:

1. **`help.model.ts`** — `help_articles` + **`help_article_versions`** + indexes.  
2. **`help.service.ts`** — **`publish()`**, **`rollback()`**, locks, **`assertPublishable`**.  
3. **Idempotency** and **`worker_status`** from day one of workers.  
4. **Minimal admin UI** — editor, lock UX, preview, publish (schedule can follow).

Optional next implementation assists (outside this doc): production-ready Mongoose schemas only, full **`help.service.ts`**, admin editor shell, or **race-condition** test scenarios.

---

## 22. Related documents in this repo

- [Auth.md](./Auth.md) — `/auth` and `/api` behavior.
- [Analytics.md](./Analytics.md) — profile views, events (help analytics can mirror patterns).
- [TRENDING_BLOGS_ROADMAP.md](./TRENDING_BLOGS_ROADMAP.md) — pipeline versioning elsewhere.
- [SUBSCRIPTIONS_STRIPE_README.md](./SUBSCRIPTIONS_STRIPE_README.md) — billing.
- `server/README.md` and `webapp/README.md` — local dev.

---

*This document is the canonical spec for the **production** help/CMS subsystem, RBAC model, and admin foundation. Update it when you add `admin-webapp/`, `server/src/modules/help/`, **`help_article_versions`**, `server/src/workers/` + **`worker_status`**, or change `/api/v1` contracts.*
