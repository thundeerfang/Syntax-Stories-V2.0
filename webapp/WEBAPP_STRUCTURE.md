# Webapp folder structure — current map, gaps, and target architecture

This document is a **whole-repo scan** of `webapp/` (May 2026): what exists today, what was already consolidated, where structure is weak, and a **phased plan** toward a more advanced, feature-oriented layout.

**Part I (§1–§10)** — directory map and migration batches.  
**Part II (§11–§15)** — scaling for multiple developers, lower cognitive load, and faster feature shipping.  
**Part III (§17–§27)** — governance, enforcement, DX, testing, performance, and anti-patterns (RFC / engineering handbook).  
**Part IV (§28–§30)** — **highest-impact improvements only** (codebase direction + priority order).

Companion docs:

| Doc | Focus |
|-----|--------|
| [README.md](./README.md) | Routes, stack, hardcoded data, UI layers |
| [COMPONENTS.md](./COMPONENTS.md) | Component inline rules; batches **P0–P6** (done) |

---

## Architecture principles

These principles align every section below. When in doubt, prefer the principle over convenience.

1. **Thin routes** — `app/` wires URL, metadata, loading, and errors; product UI lives in features.
2. **Feature ownership** — Business/domain code lives under `features/<name>/`, not `components/<domain>/`.
3. **Shared stays generic** — `shared/` (today: `components/ui`, `layout`, `retroui`) has no product semantics.
4. **Prefer Server Components** — Client only for interactivity, browser APIs, or client state (see §13).
5. **Co-locate by behavior** — Code that changes together lives together (page + sections + feature services).
6. **Public APIs over deep imports** — Import from `@/features/blog`, not `@/features/blog/components/BlogCard`.
7. **Incremental migration over rewrites** — One batch per merge; smoke-test; no big-bang folder moves.
8. **Explicit boundaries over convention-only** — Enforce layers with ESLint when Scale P3 lands (§14).

**Target shape:**

```txt
app (thin) → features (fat) → shared (generic) → lib / api (infrastructure)
```

---

## 1. Top-level webapp layout

```
webapp/
├── public/                 # Static assets (lottie, svg, favicon, …)
├── packages/
│   └── shared/             # Zod enums/schemas shared with server (profile, squads)
├── scripts/                # Tooling (shadows migrate, install-shared-deps, …)
├── reports/                # eslint-report.json (generated)
├── src/                    # ← All application code
│   ├── app/                # Next.js App Router (routes, layouts, loading.tsx)
│   ├── api/                # HTTP clients → Express backend
│   ├── components/         # Shared & domain UI (largest tree)
│   ├── features/           # Feature modules (auth, settings only today)
│   ├── hooks/              # Cross-cutting React hooks
│   ├── lib/                # Non-UI utilities (module folders — see §4)
│   ├── store/              # Zustand stores
│   ├── types/              # Shared TS types (blog, …)
│   ├── contracts/          # API DTOs — see contracts/README.md (auth, blog, squads, …)
│   ├── context/            # React context (AuthContext)
│   └── proxy.ts              # Next middleware / proxy entry
├── next.config.ts
├── package.json
└── tsconfig.json           # `@/*` → `./src/*`
```

**Scale (approx.):** ~350+ TS/TSX files under `src/`; `components/` (~142 files) is the largest bucket, then `app/` (~84), then `lib/` (~75).

---

## 2. Current `src/` directory map

### 2.1 `app/` — routes (Next.js)

```
app/
├── layout.tsx, globals.css, error.tsx, not-found.tsx, page.tsx
├── (legal)/                    # Route group: /privacy, /terms, /user-data-deletion
│   ├── layout.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── user-data-deletion/page.tsx
├── about/
├── auth/callback/[provider]/
├── blogs/
│   ├── write/page.tsx          # ~2.4k lines — blog editor
│   └── [username]/[slug]/
│       ├── page.tsx
│       ├── layout.tsx
│       └── _blogPostDetailSections.tsx   # P0 co-located
├── bookmarks/, categories/, contact/, docs/, explore/, feedback/, following/
├── invite/, invite/[code]/
├── login/, signup/
├── pricing/, profile/, profile/analytics/
├── reposts/, settings/
│   ├── page.tsx                # Thin wrapper
│   └── settings-list/          # Settings section cards (not in features/)
├── squads/, squads/featured/, squads/[slug]/
│   ├── featured/_squadsFeaturedPageContent.tsx    # P3
│   └── [slug]/_squadSlugSections.tsx              # P3
├── topics/, topics/[slug]/, topics/category/[slug]/
├── trending/
│   ├── page.tsx
│   └── _trendingPageContent.tsx                   # P2 co-located
├── explore/
│   ├── page.tsx
│   └── _explorePageContent.tsx                    # P2 co-located
├── u/[username]/, u/[username]/blogs/
├── write/
├── wallet/
└── *-callback/                 # google, github, facebook, x, discord → legacy OAuth
```

**Co-located route modules (done):** `_explorePageContent`, `_trendingPageContent`, `_blogPostDetailSections`, `_squadsFeaturedPageContent`, `_squadSlugSections`.

**Dead / duplicate route folders (cleanup candidates):**

| Path | Issue |
|------|--------|
| `app/privacy/`, `app/terms/`, `app/user-data-deletion/` | Superseded by `(legal)/`; no `page.tsx` or redirect |
| `app/products/` | No page |
| `app/help/` vs `app/docs/` | Overlapping help/docs UX |

---

### 2.2 `api/` — flat HTTP clients

```
api/
├── index.ts
├── auth.ts, blog.ts, squads.ts, bookmarks.ts, reposts.ts, follow.ts
├── tagsExplore.ts, notifications.ts, feedback.ts, contact.ts
├── marketing.ts, legal.ts, billing.ts, analytics.ts
├── reference.ts, companies.ts, github.ts, giphy.ts, unsplash.ts
├── upload.ts, sessionPing.ts, operationalHeartbeat.ts
└── client.ts
```

**Observation:** Single flat folder works at current size (~24 files). At 40+ clients, split by domain: `api/blog/`, `api/auth/`, `api/squads/`.

---

### 2.3 `lib/` — modular utilities (updated)

```
lib/
├── utils.ts                    # Shim → core/utils
├── core/                       # cn, shadows, retroUi, appwrite, entityOption, …
├── api/                        # publicApiBase, blogAuthFetch, publicLegal, publicHelp
├── auth/                       # OAuth, device fingerprint, post-auth redirect
├── blog/                       # mappers, editor, code/table/mermaid helpers
├── profile/                    # display, location, syntax card heatmap, skills
├── squads/                     # squadCategory, discover card layout
├── shell/                      # content rail, site links, cover fallback
├── feeds/                      # custom feeds, followed categories
├── media/                      # crop export, screenshot, feedback attachments
├── marketing/                  # about page icons
└── format/                     # relative time helpers
```

Each module has `index.ts` barrel exports. Prefer `@/lib/<module>/<file>` or `@/lib/<module>`.

---

### 2.4 `components/` — UI by domain + layer

```
components/
├── ui/                         # App primitives (Dialog, Button, BlogWriteEditor, lotties)
│   ├── _blogWriteEditorBlocks.tsx      # P5
│   ├── delete/, lottie/
│   └── …
├── retroui/                    # Retro design system (Input, Label, charts, form/)
├── layout/
│   ├── shell/                  # LayoutShell, _layoutShellOverlays (P4), MainLayout
│   ├── nav/                    # Navbar, Sidebar, AccountDropdown, Notifications
│   ├── footer/                 # Footer (operational status inlined P4)
│   └── rail/                   # ShellPageIntroHeader, RailSectionSubheader, …
├── blog/                       # BlogCard, _blogCardEngagement (P1), swipers, TableVisualGrid
├── profile/
│   ├── dialog/                 # _syntaxCardDialog (P6), _missingFieldsDialog (P6), uploads
│   └── syntax-card/            # EMPTY — remove after P6
├── squads/                     # SquadDiscoverCard, CreateSquadDialog, skeletons
├── explore/                    # FeaturedCategoryCard, ExploreSectionHeaderCard (2 files left)
├── trending/                   # EMPTY — removed in P2
├── home/                       # EMPTY — NewCustomFeedDialog → shell P4
├── feedback/                   # EMPTY — FeedbackDialog → shell P4
├── legal/                      # LegalPagesLayout, TOC, policy header
├── skeletons/                  # PageSkeletons (~1.4k lines), RouteLoadingSkeleton
├── search/                     # SearchDialog, SearchDialogWrapper
├── topics/, tags/, docs/, upload/, effects/, connectivity/, loader/
├── auth/, appwrite/, icons/, providers/
└── StoreHydration.tsx
```

---

### 2.5 `features/` — only auth + settings today

```
features/
├── auth/
│   ├── components/             # AuthDialog, AltchaField, steps, authDialogRender
│   └── hooks/                  # useOtpFlow
└── settings/
    ├── SettingsPage.tsx        # ~4.9k lines — main settings UI
    ├── components/
    ├── sections/
    ├── config/nav.ts
    └── lib/
```

**Gap:** Most product areas live under `components/` + `app/`, not under `features/`. Settings is split: `features/settings/SettingsPage.tsx` + `app/settings/settings-list/*`.

---

### 2.6 Other `src/` roots

| Folder | Role | Files |
|--------|------|-------|
| `hooks/` | Shared hooks | `useAuth`, `useBlogCardEngagement`, `useRequireAuth`, … |
| `store/` | Zustand | `auth`, `theme`, `customFeeds`, `ui`, `engagementEffects`, … |
| `types/` | Domain types | `blog.ts`, … |
| `contracts/` | API request/response types (mirror `src/api/*`) | [`contracts/README.md`](src/contracts/README.md), `blogApi.ts`, `squadsApi.ts`, … |
| `context/` | `AuthContext` | 1 file |

---

## 3. Consolidation already done (P0–P6)

| Batch | What moved | Co-located target |
|-------|------------|-------------------|
| **P0** | Blog post detail UI (8 files) | `app/blogs/[username]/[slug]/_blogPostDetailSections.tsx` |
| **P1** | Blog card engagement chain (4 files) | `components/blog/_blogCardEngagement.tsx` |
| **P2** | Explore + trending trees (6 files) | `app/explore/_explorePageContent.tsx`, `app/trending/_trendingPageContent.tsx` |
| **P3** | Squads featured + slug helpers (5 files) | `app/squads/featured/_squadsFeaturedPageContent.tsx`, `app/squads/[slug]/_squadSlugSections.tsx` |
| **P4** | Footer status, feedback, custom feed dialog (4 files) | `layout/footer/Footer.tsx`, `layout/shell/_layoutShellOverlays.tsx` |
| **P5** | Blog write block editors (5 files) | `components/ui/_blogWriteEditorBlocks.tsx` |
| **P6** | Syntax card + missing-fields (4 files) | `profile/dialog/_syntaxCardDialog.tsx`, `_missingFieldsDialog.tsx` |
| **Lib** | Flat `lib/*.ts` → modules | `lib/{core,api,auth,blog,profile,…}/` |

**Empty folders to delete:** `components/trending/`, `components/home/`, `components/feedback/`, `components/profile/syntax-card/`.

**Orphan file:** `components/blog/BlogCoverPlaceholder.tsx` — unused; use `PrimaryCoverFallback` from `@/lib/shell` or delete.

---

## 4. Structural issues (improvement opportunities)

### 4.1 Split brain: routes vs features vs components

| Area | Today | Problem |
|------|--------|---------|
| Settings | `features/settings/SettingsPage.tsx` + `app/settings/settings-list/*` | One feature, two trees |
| Auth | `features/auth/*` + `components/auth/*` + `app/auth/*` | OAuth UI scattered |
| Explore / Trending | Logic in `app/*/_*.tsx` | Good for page-only; explore still has 2 shared components in `components/explore/` |
| Legal | `components/legal/*` + `app/(legal)/*` | Could be `features/legal/` |

### 4.2 Oversized files (split or co-locate further)

| File | Lines | Suggestion |
|------|-------|------------|
| `features/settings/SettingsPage.tsx` | ~4,900 | Split by section under `features/settings/sections/*` or co-locate cards only |
| `app/profile/page.tsx` | ~1,500 | Extract tabs into `_profileSections.tsx` |
| `app/blogs/write/page.tsx` | ~2,400 | Extract publish/deploy into `_writePageSections.tsx` |
| `components/skeletons/PageSkeletons.tsx` | ~1,400 | Split by route group: `skeletons/blog.ts`, `skeletons/squads.ts`, … |
| `components/ui/BlogWriteEditor.tsx` | ~1,800 | Acceptable with `_blogWriteEditorBlocks`; avoid growing further |

### 4.3 API + lib + types duplication

- Blog/post shapes: `types/blog.ts`, `lib/blog/map*.ts`, `api/blog.ts` — keep but document ownership (API = transport, lib = mappers, types = canonical).
- Profile enums: `packages/shared/` + server — good; webapp should import from shared package consistently.

### 4.4 Naming inconsistencies

- Co-located files: mix of `_explorePageContent` vs `_blogPostDetailSections` — pick one convention: `_<feature>Page.tsx` or `_sections.tsx`.
- `PanelSectionHeader` vs `ExploreSectionHeaderCard` — same visual, two names.

---

## 5. Target architecture (advanced folder structure)

Goal: **thin routes**, **fat features**, **thin shared layers** — without a big-bang rewrite.

### 5.1 Target tree (hybrid feature-first)

```
src/
├── app/                              # ROUTES ONLY: page.tsx, layout.tsx, loading.tsx
│   └── <mirror URL structure, 1–3 files per segment>
│
├── features/                         # Product domains (primary home for UI logic)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/                      # optional: re-export from @/api/auth
│   │   └── lib/
│   ├── blog/
│   │   ├── components/               # BlogCard, swipers (shared across routes)
│   │   ├── write/                    # editor page sections
│   │   ├── post-detail/              # or stay co-located in app/blogs/.../
│   │   └── lib/
│   ├── squads/
│   ├── explore/
│   ├── trending/
│   ├── profile/
│   ├── settings/
│   ├── bookmarks/
│   ├── legal/
│   ├── docs/
│   ├── home/                         # feed, custom feeds
│   └── marketing/                    # about, pricing
│
├── shared/                           # Renamed from scattered roots (optional rename)
│   ├── ui/                           # was components/ui
│   ├── retroui/                      # was components/retroui
│   ├── layout/                       # was components/layout
│   ├── skeletons/
│   ├── icons/
│   ├── providers/
│   └── lib/                          # OR keep src/lib at top level
│
├── api/                              # Keep central OR features/*/api with barrel
├── hooks/                            # Only truly global hooks
├── store/
├── types/
└── contracts/
```

**Rule:** If it is used on **one route only** → live under `app/<route>/_*.tsx` or `features/<x>/pages/<route>/`. If used on **2+ routes** → `features/<domain>/components/` or `shared/`.

### 5.2 Import aliases (future)

```json
{
  "@/app/*": ["./src/app/*"],
  "@/features/*": ["./src/features/*"],
  "@/shared/*": ["./src/shared/*"],
  "@/api/*": ["./src/api/*"],
  "@/lib/*": ["./src/lib/*"]
}
```

Optional; current `@/*` → `src/*` is sufficient if folders are clear.

---

## 6. Migration roadmap (P7+)

Prioritized batches — **low risk first**. Do not start a batch until the previous one is merged and smoke-tested.

For **team-scale priority** (feature-first, boundaries, thin routes), see **§14 Scale P1–P8** — use that order when planning sprints across multiple developers.

| Phase | Scope | Risk | Outcome |
|-------|--------|------|---------|
| **P7** | Hygiene | Low | Delete empty dirs; remove `BlogCoverPlaceholder`; remove dead `app/privacy|terms|products` |
| **P8** | Legal + search + docs | Low | `features/legal/`, `features/search/`, `features/docs/`; inline wrappers |
| **P9** | Settings unify | Medium | Move `app/settings/settings-list/*` → `features/settings/sections/`; thin `app/settings/page.tsx` |
| **P10** | Profile split | Medium | `app/profile/_profileSections.tsx`; optional `features/profile/` |
| **P11** | Blog feature module | Medium | `features/blog/components/` for shared blog UI; keep route co-located detail/write |
| **P12** | API domain folders | Low | `api/blog/`, `api/auth/`, … + `api/index.ts` re-exports |
| **P13** | Skeletons split | Low | `skeletons/by-route/*.tsx` composed from `primitives.tsx` |
| **P14** | `shared/` rename | High | Rename `components/{ui,retroui,layout}` → `shared/*` (mass import change) — only if team wants strict layering |

**Not recommended soon:** Moving `retroui/` or `ui/` into each feature (duplication). Keep design system centralized.

---

## 7. Decision matrix (where does new code go?)

```
New code?
│
├─ Next.js route, metadata, loading.tsx only     → app/<route>/
├─ Used on exactly ONE route                      → app/<route>/_<name>.tsx
├─ Used on one product area (e.g. squads)        → features/<area>/ (export via index.ts)
├─ Used on 3+ unrelated areas                    → shared/ui or shared/layout (future: not components/<domain>)
├─ HTTP call to backend                          → api/<domain>.ts
├─ Pure function, no React                       → lib/<module>/
├─ Global client state                             → store/<name>.ts
├─ React hook used across features                 → hooks/
└─ Zod/schema shared with server                   → packages/shared/
```

---

## 8. Route → ownership map (quick reference)

| Route | Primary UI location today | Target owner |
|-------|---------------------------|--------------|
| `/` | `app/page.tsx`, `components/blog`, `components/home` (empty) | `features/home` |
| `/explore` | `app/explore/_explorePageContent.tsx` | `features/explore` (move file) |
| `/trending` | `app/trending/_trendingPageContent.tsx` | `features/trending` |
| `/blogs/[u]/[slug]` | `app/blogs/.../page.tsx`, `_blogPostDetailSections` | `features/blog/post-detail` |
| `/blogs/write` | `app/blogs/write/page.tsx`, `ui/BlogWriteEditor` | `features/blog/write` |
| `/squads/*` | `app/squads/*`, `components/squads` | `features/squads` |
| `/profile` | `app/profile/page.tsx`, `components/profile` | `features/profile` |
| `/settings` | `features/settings`, `app/settings/settings-list` | `features/settings` only |
| `/u/[username]` | `app/u/...`, `components/profile` | `features/profile/public` |
| Legal pages | `app/(legal)/*`, `components/legal` | `features/legal` |

---

## 9. Maintenance checklist

After any structural change:

1. `npm run lint` (or project eslint script)
2. `npx tsc --noEmit`
3. Smoke-test routes touched (see README route table)
4. Update this file + [COMPONENTS.md](./COMPONENTS.md) if consolidation batch completes
5. Run component audit (when script exists): `node scripts/audit-component-usage.mjs`

---

## 10. Summary

| Layer | Current state | Direction |
|-------|---------------|-----------|
| `app/` | Mix of thin pages + co-located `_*.tsx` (good) | Stay thin; add co-located modules per heavy route |
| `components/` | Domain folders + empty leftovers | Shrink as features absorb; keep `ui` / `retroui` / `layout` shared |
| `features/` | Only auth + settings | Grow per product domain (P8–P11) |
| `lib/` | **Modular** (done) | Keep module folders; optional `shared/lib` rename only with P14 |
| `api/` | Flat | Split by domain when file count grows (P12) |

The project is **mid-migration**: page-only UI has moved next to routes (P0–P3); shell and editor chains are co-located (P4–P5); profile dialogs consolidated (P6); utilities are module-based. The **advanced** end state is feature-first modules with a stable shared design system — implemented incrementally via **P7–P14**, not a single rewrite.

---

# Part II — Scaling architecture (teams, velocity, cognitive load)

The next gains are not “more structure” — they are **easier scaling with multiple developers**, **faster feature shipping**, and **lower cognitive load**.

---

## 11. What’s already good

Several problems many large Next.js apps struggle with are already addressed:

- Clear route grouping
- Co-located heavy route logic (`app/**/_*.tsx` from P0–P3)
- Modular `lib/` (domain modules with barrels)
- Shared design system separation (`ui/`, `retroui/`, `layout/`)
- Incremental migration strategy instead of rewrite
- Explicit roadmap phases (P0–P14)
- Ownership mapping and decision matrix (§7–§8)

The codebase has already moved away from:

- “everything in `components/`”
- giant flat `utils/` folders
- random cross-imports
- route spaghetti

That direction is sound. Part II focuses on **consistency**, **stronger boundaries**, and **reducing split ownership** so the same patterns hold at 20k+ LOC.

---

## 12. Highest-impact architectural improvements

### 12.1 Stop growing `components/` further (single highest-value cleanup)

`components/` still acts as a **semi-feature layer**:

| Current | Reality |
|---------|---------|
| `components/blog` | Feature code |
| `components/profile` | Feature code |
| `components/squads` | Feature code |

Feature logic, hooks, state, and UI are still split across `app/`, `components/`, and `features/` — that creates **mental fragmentation**.

**Rule:**

| Layer | Holds |
|-------|--------|
| **Shared** | Generic, reusable, no product semantics |
| **Features** | Business / domain |

```txt
shared/          # future rename of components/{ui,retroui,layout,skeletons,…}
  ui/
  layout/
  retroui/

features/
  blog/
  squads/
  profile/
  explore/
  …
```

Maps to target tree in §5.1 and migration batches P8–P11 in §6.

---

### 12.2 Feature public APIs (`index.ts`)

Today imports often reach deep paths:

```ts
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogCardEngagementRail } from '@/components/blog/_blogCardEngagement';
```

**Prefer** one public surface per feature:

```txt
features/blog/
  components/
  hooks/
  lib/
  index.ts          # public API
```

```ts
// features/blog/index.ts
export * from './components';
export * from './hooks';
export * from './lib';
```

```ts
import { BlogCard, BlogCardEngagementRail } from '@/features/blog';
```

Benefits: simpler imports, hidden internals, painless refactors, better IDE discoverability.

**Convention:** Only export what other features or `app/` may use. Keep `_`-prefixed or `internal/` modules private to the feature.

---

### 12.3 Enforce internal layer boundaries

Architecture is documented in this file but **not yet enforced**. Without enforcement, drift returns quickly.

**Target rules:**

```txt
shared   →  must not import features or app
features →  must not import app; avoid importing other features (use shared or explicit public API)
app      →  may import features and shared
api/lib  →  no React; features may import api/lib, not vice versa for UI
```

**Tools (recommended after boundaries matter):**

- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
- `eslint-plugin-import` (no restricted paths)

Add boundary config in a dedicated phase (see §15 — **Scale P3**).

---

### 12.4 Feature-level state (Zustand)

Today stores are mostly global:

```txt
store/
  auth.ts
  theme.ts
  customFeeds.ts
  engagementEffects.ts
  …
```

Global stores become **hidden coupling** over time.

**Target:**

```txt
features/blog/store/
features/profile/store/
features/squads/store/

store/                    # only truly global
  theme.ts
  auth.ts                 # session / shell identity
  ui.ts                   # shell chrome (feedback dialog open, etc.)
```

Keep cross-cutting shell concerns global; move **domain** state next to the feature that owns the UX.

---

### 12.5 Make `app/` extremely thin

Ideal route file:

```tsx
import { ExplorePage } from '@/features/explore';

export default function Page() {
  return <ExplorePage />;
}
```

**Stay in `app/`:** `layout.tsx`, `loading.tsx`, `error.tsx`, `metadata`, `generateStaticParams`, route params wiring.

**Move to features:** page composition, data orchestration UI, sections, dialogs owned by one product area.

Many routes are still “too smart” (large `page.tsx` or `_*.tsx` with business logic). Co-located `_explorePageContent` was a good **step**; long-term home is `features/explore/pages/ExplorePage.tsx` (§12.7).

---

### 12.6 Feature-level `api/` + `services/`

HTTP and transforms are split across `api/`, `lib/`, and `types/` — hard to see “who owns blog feed loading.”

**Target per feature:**

```txt
features/blog/
  api/              # thin wrappers (optional re-export from @/api/blog)
  services/         # orchestration, normalization, pagination merge
  types/            # feature-local types if not in src/types
  hooks/            # React only — call services, don’t embed business logic
```

| Layer | Responsibility |
|-------|----------------|
| `api/` | Raw HTTP, auth headers, URLs |
| `services/` | Business orchestration (e.g. `getBlogFeed.ts`: call API, map DTOs, merge pages) |
| `hooks/` | React integration, loading/error state |
| `lib/` (root) | Pure helpers shared across features |

Avoid bloating hooks with fetch + map + merge + cache logic.

Central `src/api/` can remain for small teams; features re-export or wrap as they migrate.

---

### 12.7 Feature entry components (replace permanent `_*.tsx` in `app/`)

**Interim (done):** `app/explore/_explorePageContent.tsx` — good for P2 consolidation.

**Long-term:**

```txt
features/explore/
  pages/
    ExplorePage.tsx
    ExploreSections.tsx
```

```tsx
// app/explore/page.tsx
import { ExplorePage } from '@/features/explore';

export default function Page() {
  return <ExplorePage />;
}
```

Scales better for teams, code review, and feature-owned tests.

---

### 12.8 Standardize naming

Current mix:

- `_explorePageContent`
- `_blogPostDetailSections`
- `_squadSlugSections`

Underscore co-location was fine for **temporary** P0–P3 merges; it should not be the permanent public shape.

**Pick one pattern (recommended):**

```txt
ExplorePage.tsx
ExploreSections.tsx
ExploreSidebar.tsx
BlogPostDetailPage.tsx
BlogPostDetailSections.tsx
```

Reserve `_` or `internal/` for **private** modules inside a feature, not for primary entry points.

---

### 12.9 Split mega files earlier

| File | ~LOC | Risk |
|------|------|------|
| `features/settings/SettingsPage.tsx` | 4,900 | Very high |
| `app/blogs/write/page.tsx` | 2,400 | High |
| `app/profile/page.tsx` | 1,500 | Medium–high |
| `components/ui/BlogWriteEditor.tsx` | 1,800 | High (mitigated by `_blogWriteEditorBlocks`) |
| `components/skeletons/PageSkeletons.tsx` | 1,400 | Medium |

**Guideline:** Above ~1,200–1,500 LOC, split by **section** or **tab** into separate files in the same feature folder. Editors and settings are the worst offenders for merge conflicts and onboarding cost.

Prioritize **Scale P2** (§15) — aligns with doc batches P9–P10.

---

### 12.10 Architecture tooling

The repo is large enough to justify automation beyond manual audits.

| Tool | Use |
|------|-----|
| [madge](https://github.com/pahen/madge) | Dependency graph, circular deps |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | Rules + violations report |
| [knip](https://github.com/webpro/knip) | Unused exports, dead files |
| `scripts/audit-component-usage.mjs` | Single-use component detection (§9) |

**Also useful:** route bundle analysis (Next.js / `@next/bundle-analyzer`), especially before splitting mega pages.

---

### 12.11 Server / client separation conventions

App Router projects need explicit conventions as server actions, cache, and RSC grow.

**Options (pick one for the team):**

```txt
features/blog/server/     # RSC, server actions, server-only fetch
features/blog/client/     # 'use client' trees
```

Or file suffixes: `*.server.ts`, `*.client.tsx` (document which you choose).

Without this, server/client boundary mistakes and accidental client bundles grow quickly.

---

### 12.12 Migration strategy (keep doing this)

**Do not** single-rewrite into `features/` + `shared/`. Large rewrites usually fail.

Continue phased batches (§6 P7–P14) and the scale-first order in §15. Merge one batch, smoke-test routes, then proceed.

---

## 13. Rendering and data-fetch ownership

Not fully specified in Part I — add explicit rules as the app grows.

### Rendering rules

- Prefer **Server Components** by default for static or server-fetched shells.
- Add `'use client'` only for interactivity, browser APIs, or Zustand/subscriptions.
- Fetch **initial page-critical data** on the server when possible (layout/page or feature server module).
- Avoid **client waterfalls** (layout client → page client → child client each fetching).
- Feature **hooks** should not own first paint for SEO-critical or LCP-critical routes unless unavoidable.

### Data-fetch ownership

| Concern | Owner |
|---------|--------|
| Route metadata, static params | `app/` |
| Initial list/detail payload (RSC) | `features/<x>/server/` or page server wrapper |
| Infinite scroll, mutations, optimistic UI | `features/<x>/hooks/` + `services/` |
| Cross-route cache / revalidation tags | Document per feature in feature README or `features/<x>/cache.ts` |
| Global session | `store/auth` + `features/auth` |

### Caching strategy (to document per feature as you adopt)

- What is `revalidate` / `cache: 'no-store'` vs static?
- Which endpoints use React Query vs server fetch?
- Squad/blog feed: document in `features/<name>/README.md` when migrated.

Revisit when adding Server Actions broadly.

---

## 14. Highest-ROI priority order (scale-first)

Two numbering schemes exist on purpose:

| Series | Purpose |
|--------|---------|
| **P0–P14** (§6) | File-move consolidation batches (COMPONENTS.md) |
| **Scale P1–P8** (below) | Team velocity / architecture quality — **recommended merge order** |

Map between them where they overlap.

### Immediate

| Scale | Action | Maps to |
|-------|--------|---------|
| **Scale P1** | Feature-first migration: domain code out of `components/<domain>` into `features/<domain>` with `index.ts` public API | P8–P11, §12.1 |
| **Scale P2** | Split mega files: Settings, Profile, Blog write | P9–P10, §12.9 |
| **Scale P3** | Enforce import boundaries (ESLint) | New — §12.3 |

### Near future

| Scale | Action | Maps to |
|-------|--------|---------|
| **Scale P4** | Thin `app/` routes; feature entry `pages/*Page.tsx` | §12.5, §12.7 |
| **Scale P5** | Feature-level `store/`, `services/` | §12.4, §12.6 |
| **Scale P6** | Public feature APIs stable; stop deep imports | §12.2 |

### Later

| Scale | Action | Maps to |
|-------|--------|---------|
| **Scale P7** | `shared/` rename (`components/ui` → `shared/ui`, …) | P14 |
| **Scale P8** | Tooling: madge, dependency-cruiser, knip, bundle analysis | §12.10 |

### Hygiene (do anytime)

| Doc batch | Action |
|-----------|--------|
| **P7** | Delete empty dirs, orphan `BlogCoverPlaceholder`, dead legal folders |

---

## 15. Final assessment

| Dimension | Status |
|-----------|--------|
| Documentation | Above average for a product frontend — map, phases, ownership, decision matrix |
| Main gap | **Consistency** and **enforced boundaries**, not lack of ideas |
| End state | `app` (thin) + `features` (fat) + `shared` (generic) |

```txt
Today (transitional):
  app  +  components  +  features  +  lib

Target (scalable):
  app (thin)
  features (fat, public index.ts, services, optional store)
  shared (generic UI only)
  lib + api (shared infrastructure)
```

The consolidation work (P0–P6) and modular `lib/` were the right first moves. The highest long-term leverage is **stop treating `components/` as a second feature layer**, **thin routes**, and **enforce layers** so many developers can ship without re-learning where code lives every sprint.

---

# Part III — Governance, enforcement, and operational conventions

Part I maps folders; Part II explains how architecture scales with teams. Part III defines **how we govern** the system so it does not drift: documentation per feature, testing and performance ownership, completion criteria, and anti-patterns.

This section turns the doc from a folder audit into an **internal architecture RFC / engineering handbook** — covering cognitive load, merge-conflict prevention, velocity bottlenecks, and organizational impact, not only directory names.

---

## 17. What improved in this document (meta)

| Earlier doc | This doc |
|-------------|----------|
| What folders exist | Why decisions exist, tradeoffs, scaling, DX, ownership |
| Routes and file lists | Cognitive load, merge conflict prevention, velocity |
| Single migration track (P0–P14) | **Two tracks:** migration chronology vs strategic priority (Scale P1–P8, §14) |

Strongest additions in Part II: shared vs feature philosophy (§12.1), feature `services/` layer (§12.6), public `index.ts` APIs (§12.2), import boundaries (§12.3), rendering/data ownership (§13).

---

## 18. Feature documentation standard

Every major feature should eventually include:

```txt
features/blog/README.md
```

**Suggested contents:**

| Section | Purpose |
|---------|---------|
| Ownership | Team or primary maintainers |
| Data flow | Server vs client fetch, main entry components |
| APIs used | Which `api/*` or feature `api/` modules |
| Cache rules | `revalidate`, React Query keys, invalidation |
| Server/client boundaries | What is RSC vs `'use client'` |
| Important decisions | Non-obvious choices worth preserving |
| Known pitfalls | Editor quirks, auth requirements, rate limits |

Without feature READMEs, architecture knowledge stays **tribal** and onboarding slows.

**When to add:** When a feature moves out of `components/<domain>/` into `features/<name>/` (Scale P1), or when a feature exceeds ~2–3 primary entry files.

---

## 19. Dependency direction

### Allowed dependency flow

```txt
                    ┌─────────────┐
                    │   packages/  │
                    │   shared     │  (Zod schemas — server + webapp)
                    └──────┬──────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      ▼                      │
    │  ┌────────┐    ┌───────────┐    ┌─────────┐ │
    │  │  app/  │───▶│ features/ │───▶│ shared/ │ │
    │  └────────┘    └─────┬─────┘    └────┬────┘ │
    │       │                │               │     │
    │       │                ▼               ▼     │
    │       │          ┌─────────────────────────┐│
    │       └─────────▶│  lib/  +  api/  + types/ ││
    │                  └─────────────────────────┘│
    └─────────────────────────────────────────────┘
```

**Rules (must hold):**

| From | May import | Must not import |
|------|------------|-----------------|
| `app/` | `features/*`, `shared/*`, `lib/*`, `api/*` | — |
| `features/*` | `shared/*`, `lib/*`, `api/*`, other features’ **public** `index.ts` only | `app/*` |
| `shared/*` | `lib/*` (pure helpers only) | `features/*`, `app/*` |
| `lib/`, `api/` | Each other, `types/`, `contracts/` | React UI, `features/*`, `app/*` |

**Forbidden (architecture collapse):**

```txt
shared  ✕→  features
shared  ✕→  app
features  ✕→  app
feature A ✕→  feature B/internal   (use public API or move to shared/lib)
```

Enforce with dependency-cruiser / eslint-plugin-boundaries (Scale P3, §14).

---

## 20. Testing ownership strategy

Define testing by layer so approaches are consistent across the team.

| Layer | Primary test type | Notes |
|-------|-------------------|--------|
| `lib/`, `services/` | Unit | Pure functions, mappers, orchestration |
| `features/*/hooks/` | Hook tests | React Testing Library + mocked services |
| `features/*/pages/` | Integration | Compose sections; mock API at service boundary |
| `shared/ui`, `retroui/` | Visual / Storybook (optional) | Design system regressions |
| `app/` routes | Smoke / E2E | Critical paths only (auth, publish, signup) |

**Conventions:**

- Mock at **service** boundary, not raw `fetch` in every test.
- Colocate `*.test.ts` next to module or `features/<x>/__tests__/` — pick one pattern per feature and document in feature README.
- Do not require 100% coverage on mega-files; split first (§12.9), then test slices.

---

## 21. When NOT to create a feature module

Feature-first systems fail when everything becomes a “feature.” **Do not** create `features/<name>/` for:

| Situation | Instead |
|-----------|---------|
| One-off dialog used on a single route | `app/<route>/_*.tsx` or private module in parent feature |
| Route-only utility (< ~100 LOC) | Co-locate in route or feature `lib/internal.ts` |
| Temporary experiment / A/B branch | Branch or `app/` until stable |
| Isolated area **< ~500 LOC** with no expected reuse | Keep co-located until second consumer appears |
| Generic button/layout tweak | `shared/ui` |

**Symptoms of over-modularization:** shallow features, folder explosion, fake abstractions, two-line `index.ts` re-exports with no real boundary.

**Rule of thumb:** Create or extend a feature when **two routes** or **two teams** need the same domain logic, or when the area exceeds ~1,200 LOC and has clear product meaning.

---

## 22. Performance ownership

Architecture here focuses on organization; runtime performance needs explicit ownership too.

| Concern | Owner / rule |
|---------|----------------|
| Route bundle size | Feature owner; lazy-load heavy tabs/sections |
| Client component budget | Prefer RSC shell; audit `'use client'` at page root |
| Heavy dependencies | Contain in feature (e.g. editor, mermaid, cropper) — avoid importing from `shared/ui` barrel if it pulls entire lib |
| Code splitting | `dynamic(() => import(...), { ssr: false })` for editor-only routes |
| Lists / swipers | Virtualize or paginate; skeletons match final layout |
| Images | Use existing optimized remote image patterns |

**High-risk areas in this repo:**

- Blog write / `BlogWriteEditor` + `_blogWriteEditorBlocks`
- `PageSkeletons` (large, imported from layout shell)
- Retro UI + lottie bundles
- Swiper / feed rails on home and explore

**Action:** When touching a feature, note client bundle impact in PR description if new client dependencies are added.

---

## 23. Migration done criteria

A feature migration is **complete** when all of the following are true (prevents half-migrations living forever):

- [ ] No remaining imports from `components/<domain>/` for that product area (except shared UI primitives).
- [ ] `features/<name>/index.ts` exists and documents public exports.
- [ ] App route(s) are thin wrappers around `features/<name>/pages/*Page.tsx` (or documented exception).
- [ ] Feature owns `components/`, `hooks/`, and optionally `services/`, `store/` under one tree.
- [ ] Deep imports from other packages only use `@/features/<name>`, not internal paths.
- [ ] Feature README added or updated (§18).
- [ ] ESLint boundary rules pass for that feature (once Scale P3 is enabled).
- [ ] Smoke tests pass for affected routes (see README route table).

**Interim state** (acceptable short-term): co-located `app/**/_*.tsx` with checklist item “move to `features/*/pages/`” tracked in issue/PR.

---

## 24. Architecture anti-patterns

People remember anti-patterns faster than ideals. **Avoid:**

| Anti-pattern | Why it hurts |
|--------------|--------------|
| `shared/` importing `features/` | Inverts dependency direction; shared stops being generic |
| `features/` importing `app/` | Couples domain to routing; untestable in isolation |
| Feature-to-feature deep imports | Hidden coupling; use public `index.ts` or `lib/` |
| Hooks with heavy business orchestration | Untestable; duplicates service logic |
| Business logic in `app/**/page.tsx` | Blocks thin routes and RSC strategy |
| Global Zustand for feature-only state | Hidden cross-feature coupling |
| Growing `components/blog`, `components/profile`, … | Two feature systems (see §26) |
| Giant catch-all `utils.ts` / god modules | Use `lib/<module>/` |
| Permanent `_Foo.tsx` as public entry | Looks temporary; weak discoverability (§25) |
| New code only in `components/<domain>/` | Extends shadow-feature layer |

**Prefer:** services for orchestration, hooks for React glue, thin routes, feature README, public APIs.

---

## 25. Naming: retire `_*.tsx` co-location pattern

Underscore-prefixed files made sense during **P0–P3 consolidation** (signals “private to route, not a public component”).

Long-term they:

- Look temporary
- Hide ownership in file search
- Weaken discoverability (`_explorePageContent` vs `ExplorePage`)

| Interim (today) | Target |
|-----------------|--------|
| `app/explore/_explorePageContent.tsx` | `features/explore/pages/ExplorePage.tsx` |
| `app/blogs/.../_blogPostDetailSections.tsx` | `features/blog/post-detail/BlogPostDetailSections.tsx` |
| `components/blog/_blogCardEngagement.tsx` | `features/blog/components/BlogCardEngagement.tsx` (internal or exported via index) |

**Convention going forward:**

- `FeatureNamePage.tsx`, `FeatureNameSections.tsx` for real modules
- `internal/` subfolder or non-exported modules for private pieces — not leading `_` on primary filenames

Rename during the same PR that moves a file into `features/` (Scale P1 + Scale P4), not as a standalone churn PR.

---

## 26. Biggest remaining architectural risk

The single most important unresolved issue:

```txt
components/  still acts as shadow-features
```

Two parallel “feature systems” exist today:

```txt
features/           ← auth, settings (real feature modules)
components/blog/    ← domain UI still here
components/profile/
components/squads/
…
```

This causes:

- Confusion about where new code goes
- Duplicated ownership semantics
- Import inconsistency (`@/components/blog` vs `@/features/blog`)
- Migration paralysis (“we’ll move it later”)

**Resolution:** Scale P1 — stop adding domain code under `components/<domain>/`; migrate existing domains incrementally (§14, §23).

Until this is fixed, enforce informally in PR review: **no new domain folders under `components/`**.

---

## 27. Next evolution (governance summary)

| Dimension | Part I | Part II | Part III (this) |
|-----------|--------|---------|------------------|
| Structure | ✓ | | |
| Migration batches | ✓ | | |
| Team scaling | | ✓ | |
| Boundaries & enforcement | | ✓ | ✓ |
| Rendering / data | | ✓ | |
| Testing / performance | | | ✓ |
| Anti-patterns & done criteria | | | ✓ |
| Feature READMEs | | | ✓ |

**Strongest long-term direction (unchanged):**

```txt
app (thin)
features (fat — public index.ts, services, optional store)
shared (generic)
lib + api (infrastructure)
```

**Next operational priorities:**

1. **Scale P1** — eliminate `components/` as shadow-features (§26)
2. **Scale P2** — split Settings / Profile / Blog write mega-files (§12.9)
3. **Scale P3** — ESLint boundaries (§12.3, §19)
4. Feature README template (§18) on first migrated feature
5. **Scale P4–P6** — thin routes, feature stores/services, stable public APIs

This document now exceeds what many production startups keep internally. The remaining work is less about ideas and more about **governance, enforcement, and finishing the `components/` → `features/` transition** without a rewrite.

---

# Part IV — Highest-impact improvements (action plan)

This section is the **short list**: what matters most for the handbook *and* the codebase. Details live in Part II–III; this is the execution order.

---

## 28. The ten highest-impact improvements

### 28.1 Eliminate `components/` as shadow features (most important)

**Current problem** — two feature systems:

```txt
features/
components/blog/
components/profile/
components/squads/
```

This creates ownership confusion, inconsistent imports, migration paralysis, and duplicated patterns.

**Major fix** — move all domain/business code into `features/<domain>/`. Keep `components/` only for shared generic UI, layout, and primitives.

This is the **single most important** architectural improvement. See §26, Scale P1 (§14).

---

### 28.2 Enforce architecture boundaries with ESLint

Architecture is documented but not yet enforced. Without tooling, `shared` imports `features`, `features` import `app`, deep imports spread, and layers collapse over 12–18 months.

**Major fix** — add `eslint-plugin-boundaries` and `dependency-cruiser`. Enforce:

```txt
app → features → shared → lib/api
```

Forbidden:

```txt
shared → features
features → app
feature → feature/internal (use public index only)
```

See §12.3, §19, Scale P3 (§14).

---

### 28.3 Thin the `app/` layer aggressively

Routes are still partially too smart (composition, orchestration, and business UI in `page.tsx` or co-located `_*.tsx`).

**Major fix** — routes should look like:

```tsx
export default function Page() {
  return <ExplorePage />;
}
```

Move composition, orchestration, sections, and business UI into `features/<domain>/pages/`. Improves maintainability, testing, onboarding, and ownership. See §12.4, Scale P4 (§14).

---

### 28.4 Split mega files immediately

| File | LOC (approx) | Risk |
|------|----------------|------|
| `features/settings/pages/SettingsPage.tsx` | ~4,900 | Critical |
| `app/blogs/write/page.tsx` (+ editor blocks) | ~2,400 | High |
| `app/profile/page.tsx` (+ panels) | ~1,500 | High |

**Major fix** — split by sections, tabs, workflows, and orchestration layers **before** adding more features. Large files become merge-conflict hotspots, onboarding nightmares, and refactor blockers. See §12.9, Scale P2 (§14).

---

### 28.5 Introduce feature-level services layer

Logic is spread across hooks, `lib/`, and `api/`. Hooks become mini-backends; transforms duplicate.

**Major fix** — standardize per feature:

```txt
features/blog/
  api/        # HTTP only
  services/   # orchestration + business logic
  hooks/      # React integration only
```

| Layer | Responsibility |
|-------|----------------|
| `api/` | Request/response, types, no React |
| `services/` | Orchestration, mapping, validation, cache invalidation calls |
| `hooks/` | `useQuery` / `useMutation` wiring to services |

See §12.6, Scale P5 (§14).

---

### 28.6 Stop deep imports — public feature APIs

**Avoid:**

```ts
import X from "@/features/blog/components/X";
import Y from "@/components/blog/BlogCard";
```

**Prefer:**

```txt
features/blog/index.ts   → public surface
```

```ts
import { BlogCard } from "@/features/blog";
```

Stable boundaries, painless refactors, hidden internals. See §12.2, Scale P6 (§14).

---

### 28.7 Remove permanent `_*.tsx` architecture

Interim co-location (P0–P3) produced files such as `_explorePageContent.tsx`, `_blogPostDetailSections.tsx`. They look transitional and hurt discoverability.

**Major fix** — rename when moving into features:

```txt
features/explore/pages/ExplorePage.tsx
features/explore/pages/ExploreSections.tsx
features/blog/post-detail/BlogPostDetailSections.tsx
```

Do not add new leading-underscore primary filenames. See §25.

---

### 28.8 Add feature READMEs

Highest-ROI governance improvement after boundary enforcement.

**Major fix** — every major feature gets `features/<name>/README.md` (ownership, data flow, APIs, cache rules, server/client boundaries, decisions, pitfalls). See §18.

---

### 28.9 Introduce ADRs (architecture decision records)

This handbook documents **current state** and **target state**; it does not preserve **why** past choices were made.

**Major fix** — add at repo root:

```txt
docs/adr/
  001-feature-first-architecture.md
  002-rsc-rendering-strategy.md
  003-zustand-boundaries.md
```

Each ADR: context, decision, consequences, status (accepted/superseded). Link from feature READMEs when relevant.

---

### 28.10 Governance + PR enforcement

Principles exist; they must become daily behavior.

**Major fix** — PR checklist (reviewer + author):

```txt
[ ] Thin route preserved (no new business logic in app/page.tsx)
[ ] No deep imports (use @/features/<name> public API)
[ ] No shared → feature import
[ ] No new domain code under components/<domain>/
[ ] Client bundle impact noted if new heavy deps
[ ] Feature README updated if behavior/cache boundaries changed
```

Optional later: CI job running `dependency-cruiser` on PRs; CODEOWNERS per `features/*`.

---

## 29. Priority order

### Immediate (do first)

| # | Item | § |
|---|------|---|
| 1 | Eliminate `components/` shadow-features | 28.1, §26 |
| 2 | Enforce import boundaries (ESLint + dependency-cruiser) | 28.2 |
| 3 | Split mega files (Settings, blog write, profile) | 28.4 |
| 4 | Thin `app/` routes | 28.3 |

### Next

| # | Item | § |
|---|------|---|
| 5 | Feature `api/` + `services/` + `hooks/` split | 28.5 |
| 6 | Public `features/*/index.ts` APIs | 28.6 |
| 7 | Rename / relocate `_*.tsx` into feature pages | 28.7 |
| 8 | Feature READMEs | 28.8 |

### Later

| # | Item | § |
|---|------|---|
| 9 | ADR system under `docs/adr/` | 28.9 |
| 10 | Governance automation (CI boundaries, PR template) | 28.10 |

Maps to Scale roadmap: **Immediate** ≈ Scale P1–P4; **Next** ≈ Scale P5–P6 + §18; **Later** ≈ Scale P8 + ADRs.

---

## 30. Strategic direction (do not reinvent structure)

The architecture direction is already correct:

```txt
app (thin)
features (fat)
shared (generic)
lib + api (infrastructure)
```

**Remaining work is not new folders** — it is:

- **Enforcement** (ESLint, dependency-cruiser, PR checklist)
- **Ownership consistency** (`features/` owns domain; `components/` generic only)
- **Finishing the migration** (shadow-features → features, thin routes, mega-file splits)

Inventing additional top-level layers or new naming schemes before P1–P4 complete will slow the team more than it helps.
