# Syntax Stories — Webapp

Next.js 15 App Router frontend for the Syntax Stories platform.  
Retro UI (sharp corners, block shadows), Tailwind v4, Zustand stores, React Query for mutations.

This document maps **every route**, the **source tree**, where **custom CSS duplicates** the design system, **duplicate components**, and **hardcoded data** that should live on the **server** (with existing seeds/APIs noted).

---

## Stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| State | Zustand (`src/store/`), React Query (`src/components/providers/QueryProvider.tsx`) |
| Forms / inputs | `src/components/retroui/` (primary design system) |
| Primitives | `src/components/ui/` (dialogs, `BlockShadowButton`, `RetroCard`, `RetroSortDropdown`, editors) |
| Retro tokens | `globals.css` `@utility` + `src/lib/retroUi.ts` |
| API | `src/api/*` → Express backend (`NEXT_PUBLIC_API_BASE_URL`) |

---

## App routes (42 pages)

URLs omit the `(legal)` route-group segment.

| URL | File | Purpose |
|-----|------|---------|
| `/` | `app/page.tsx` | Home feed (dashboard, squads rail, blog cards) |
| `/about` | `app/about/page.tsx` | Marketing / team / **hardcoded** journey & plans |
| `/bookmarks` | `app/bookmarks/page.tsx` | Saved posts + groups |
| `/categories` | `app/categories/page.tsx` | Taxonomy categories from `GET /api/blog/taxonomy` |
| `/contact` | `app/contact/page.tsx` | Contact form |
| `/explore` | `app/explore/page.tsx` | Taxonomy + squads explore |
| `/feedback` | `app/feedback/page.tsx` | Feedback entry |
| `/following` | `app/following/page.tsx` | Following feed |
| `/login` | `app/login/page.tsx` | Login |
| `/signup` | `app/signup/page.tsx` | Signup + invite ref |
| `/pricing` | `app/pricing/page.tsx` | Plans / Stripe checkout |
| `/profile` | `app/profile/page.tsx` | Own profile (large page) |
| `/profile/analytics` | `app/profile/analytics/page.tsx` | Profile analytics |
| `/reposts` | `app/reposts/page.tsx` | Repost library |
| `/settings` | `app/settings/page.tsx` | Profile settings (~5k lines) |
| `/trending` | `app/trending/page.tsx` | Trending posts |
| `/wallet` | `app/wallet/page.tsx` | Wallet placeholder |
| `/write` | `app/write/page.tsx` | Redirect / write entry |
| `/blogs/write` | `app/blogs/write/page.tsx` | Blog editor |
| `/blogs/[username]/[slug]` | `app/blogs/[username]/[slug]/page.tsx` | Post detail |
| `/docs` | `app/docs/page.tsx` | Help docs index |
| `/docs/[slug]` | `app/docs/[slug]/page.tsx` | Help article |
| `/help` | `app/help/page.tsx` | Help hub |
| `/help/sign-in` | `app/help/sign-in/page.tsx` | Help: sign-in |
| `/help/[slug]` | `app/help/[slug]/page.tsx` | Help article |
| `/privacy` | `app/(legal)/privacy/page.tsx` | Privacy (CMS legal API) |
| `/terms` | `app/(legal)/terms/page.tsx` | Terms |
| `/user-data-deletion` | `app/(legal)/user-data-deletion/page.tsx` | UDD |
| `/squads` | `app/squads/page.tsx` | Squad directory |
| `/squads/featured` | `app/squads/featured/page.tsx` | Featured squads |
| `/squads/[slug]` | `app/squads/[slug]/page.tsx` | Squad detail |
| `/topics` | `app/topics/page.tsx` | Tags index |
| `/topics/[slug]` | `app/topics/[slug]/page.tsx` | Tag landing |
| `/topics/category/[slug]` | `app/topics/category/[slug]/page.tsx` | Category landing |
| `/u/[username]` | `app/u/[username]/page.tsx` | Public profile |
| `/invite` | `app/invite/page.tsx` | Invite program |
| `/invite/[code]` | `app/invite/[code]/page.tsx` | Attach invite code |
| `/auth/callback/[provider]` | `app/auth/callback/[provider]/page.tsx` | OAuth callback |
| `/google-callback` … `/x-callback` | `app/*-callback/page.tsx` | Legacy → `/auth/callback/*` |

**Layouts:** root `layout.tsx`, `bookmarks/layout.tsx`, `pricing/layout.tsx`, `(legal)/layout.tsx`, `docs/layout.tsx`.

**Loading UI:** `loading.tsx` on write, profile, settings, docs, contact, OAuth callbacks (root uses `LayoutShell` + `RouteLoadingSkeleton`).

**Redirects** (`next.config.ts`): `/tag/:slug` → `/topics/:slug`, `/squads/discover` → `/squads/featured`, `/upgrade` → `/pricing`, `/documentation` → `/docs`.

**Dead folders (no `page.tsx`):** `app/privacy/`, `app/terms/`, `app/user-data-deletion/` (superseded by `(legal)/`), `app/products/`.

---

## Source tree

```
webapp/src/
├── app/                    # Routes, co-located settings-list/, buttonStyles.ts
├── api/                    # HTTP clients (auth, blog, squads, reference, billing, …)
├── components/
│   ├── layout/             # shell/, nav/, footer/, rail/
│   ├── retroui/            # Design system: Input, Label, Toggle, SearchableSelect, charts
│   ├── ui/                 # Dialog, BlockShadowButton, Lotties, BlogWriteEditor, …
│   ├── blog/               # Cards, editor blocks, comments, TOC
│   ├── profile/            # Heatmap, syntax card, dialogs
│   ├── squads/             # Directory, create/share dialogs
│   ├── explore/            # Explore page blocks
│   ├── trending/           # Trending hero
│   ├── topics/             # Topic UI
│   ├── home/               # NewCustomFeedDialog
│   ├── search/             # Global search dialog
│   ├── docs/               # Docs sidebar
│   ├── legal/              # Policy chrome + legalUi.ts tokens
│   ├── skeletons/          # PageSkeletons, RouteLoadingSkeleton
│   ├── auth/               # OAuth callback UI
│   ├── feedback/           # Feedback dialog
│   ├── upload/             # Image crop upload
│   ├── connectivity/       # Offline gate
│   └── providers/          # QueryProvider
├── features/auth/          # AuthDialog, OTP flow (outside components/)
├── hooks/                  # useAuth, useRequireAuth, useSettingsAuthSlice, …
├── lib/                    # Domain helpers (profile, blog, squads, reference search)
└── store/                  # Zustand: auth, theme, sidebar, customFeeds, toast, …
```

**Removed:** `src/data/` — reference entities & tech stack now come from Mongo via `/api/reference/*` (seeded on server start).

---

## UI layers (what to use when)

| Layer | Path | Use for |
|--------|------|---------|
| **RetroUI** | `@/components/retroui` | Forms: `Input`, `Label`, `Textarea`, `Toggle`, `SearchableSelect`, `EntitySearchInput`, `Alert`, toasts |
| **UI primitives** | `@/components/ui` | `Dialog`, `BlockShadowButton`, `GhostOutlineButton`, `Tabs`, `HoverCard`, delete confirms |
| **Layout** | `@/components/layout` | `LayoutShell`, `Navbar`, `SidebarDrawer`, rails, breadcrumbs |
| **Legal tokens** | `@/components/legal/legalUi.ts` | Shared class strings for legal/docs chrome |
| **Shadow token** | `@/lib/shadows.js` | Single block shadow: `SHADOW` (`4px 4px 0 var(--border)`) |
| **Page-local** | `app/**/page.tsx` | Often re-declares retro shadows instead of imports above |

**Adoption gap:** Only ~12 files import `@/components/retroui` directly; many pages use raw `<button>` + long `className` strings. `Button` from `@/components/ui` is used in ~10 feature files; most CTAs bypass it.

---

## Custom CSS & design-token drift

### Central tokens (`globals.css`)

- CSS variables: `--background`, `--primary`, `--border`, `--header-height`, `--block-btn-hover-inset`, etc.
- Tailwind `@theme` defines one block shadow: `--shadow` → class `shadow`.
- **`src/lib/shadows.js`** exports `SHADOW`, `SHADOW_BLOCK_BUTTON`, `SHADOW_GHOST_HOVER`. Do not use inline `shadow-[…]` or size variants.
- **Intended** button pattern: `BlockShadowButton` / `blockShadowButtonClassNames()` (`components/ui/BlockShadowButton.tsx`).

### Repeated inline patterns (should be tokens or components)

| Pattern | Approx. files | Fix |
|---------|----------------|-----|
| `shadow` | — | Import `SHADOW` from `@/lib/shadows` or use `retro-card` utilities |
| `border-4 border-border bg-card` | 25+ | `RetroCard` / `legalUi.LEGAL_RETRO_CARD` |
| `font-mono text-[10px] font-black uppercase` | Widespread | RetroUI `Text` variant or shared `retroLabel` utility |
| `h-[42px] w-[7.25rem]` sort triggers | `bookmarks`, `topics` | Extract `RetroSortDropdown` |
| Hard hex colors `text-[#71717a]` | `SyntaxCardMiniHeatmap` | `text-muted-foreground` |
| `style={{ width, height, gap }}` | Heatmaps, Lotties, charts | OK for dynamic layout; prefer CSS vars where fixed |

### `style={{}}` usage (legitimate vs smell)

| OK | Smell / consolidate |
|----|---------------------|
| Lottie dimensions, progress bars, positioned hover cards | Duplicate month arrays, invite page inline styles |
| Blog write selection toolbar position | `SyntaxCardSquare` fixed 1080×1080 export canvas |

### Shared token files (good examples)

- `components/legal/legalUi.ts` — legal zone; **import instead of copying**
- `app/settings/buttonStyles.ts` — wraps `BlockShadowButton` for settings
- `lib/shellContentRail.ts` — `SHELL_CONTENT_RAIL_CLASS` for page width
- `lib/shadows.js` — single source for all `shadow-*` / `drop-shadow-*` class names

### Underused shared components

| Component | Duplicated by |
|-----------|----------------|
| `RetroCard` | Prefer `retro.cardLg` + `SHADOW` from `@/lib/shadows` |
| `BlockShadowButton` | Use `SHADOW_BLOCK_BUTTON` instead of manual shadow classes |
| `legalUi.LEGAL_PRIMARY_CTA` | Custom primary buttons on contact, invite, settings |

---

## Duplicate components (consolidate into `ui/` or `retroui/`)

| Duplicate | Locations | Suggested single component |
|-----------|-----------|----------------------------|
| ~~**Sort dropdown**~~ | bookmarks, topics | ✅ `@/components/ui/RetroSortDropdown` |
| ~~**Retro card shell**~~ | `RetroCard` in `ui/`, `retro-card-lg` utility | ✅ `RetroCard` + `globals.css` utilities |
| **Profile skeleton keys** | `u/[username]/page.tsx`, `ProfileCardSkeleton.tsx` | Shared constant in `skeletons/` |
| **Month labels** | `settings/page.tsx`, `u/[username]/page.tsx`, `ProfileHeatmap.tsx`, `BlogCard.tsx`, `profileDisplay.ts` | `lib/dateLabels.ts` or server locale config |
| **Footer links** | `layout/footer/Footer.tsx`, `contact/page.tsx` | `lib/siteLinks.ts` or CMS |
| ~~**Segmented control**~~ | settings, upload dialog | ✅ `components/ui/FullWidthSegmentedControl` |
| **Click-outside dropdown** | Notifications, bookmarks sort, topics sort, squad card menu | `useDismissiblePanel` hook + shared panel styles |

---

## Hardcoded data → should be server / CMS

### Already on server (use API; remove client copies)

| Data | Server | Webapp consumer |
|------|--------|-----------------|
| Blog categories & tags | `ensureBlogTaxonomySeeds`, `BlogCategory` / `BlogTag` | `/topics`, explore, blog write |
| Reference companies / schools / orgs | `ensureCmsReferenceSeeds`, `/api/reference/entities` | `lib/referenceSearch.ts`, settings |
| Tech stack autocomplete | `TechStackReference`, `/api/reference/tech-stack` | Settings stack & tools |
| Legal policies | `ensureLegalPoliciesSeed`, `/api/v1/legal` | `(legal)/*` |
| Feedback categories | `ensureFeedbackCategorySeeds` | `FeedbackDialog` |
| Squad categories enum | `Squad.ts` `SQUAD_CATEGORY_VALUES` | `lib/squadCategory.ts` (**mirror** — keep in sync or fetch) |

### Still hardcoded in webapp (migrate)

| Data | File(s) | Recommendation |
|------|---------|----------------|
| ~~**Category list + counts**~~ | `app/categories/page.tsx` | ✅ `blogApi.getTaxonomy()` |
| ~~**About journey, tech stack, plans**~~ | `app/about/page.tsx` | ✅ `GET /api/marketing/about` |
| ~~**Team / developers**~~ | `GET /api/marketing/about` | ✅ CMS `marketing_pages` seed |
| ~~**Notifications**~~ | `NotificationsDropdown.tsx` | ✅ `GET /api/notifications` (empty until inbox persistence) |
| **Navbar links** | `Navbar.tsx` `navLinks` | Config endpoint or shared `siteNav` module |
| **Sidebar nav** | `SidebarDrawer.tsx` `MAIN_NAV`, `RAIL_UTILITY_LINKS` | Same as navbar |
| ~~**Employment types**~~ | `features/settings/SettingsPage.tsx` | ✅ `@syntax-stories/shared` + server Zod |
| ~~**Location types**~~ | `features/settings/SettingsPage.tsx` | ✅ `@syntax-stories/shared` + server Zod |
| ~~**Months (long)**~~ | `lib/dateLabels.ts` | ✅ `MONTH_SELECT_OPTIONS`, `formatMonthYear*` |
| **Bio symbol picker** | `settings/page.tsx` `BIO_SYMBOLS` | Low priority; can stay client |
| ~~**Blog publish languages**~~ | deploy overlay | ✅ removed UI; posts default to `en` |
| ~~**Contact topics**~~ | `lib/siteLinks.ts` | ✅ `CONTACT_TOPIC_SUGGESTIONS` |
| **Custom feed icons** | `NewCustomFeedDialog.tsx` `ICON_PRESETS` | Client OK |
| **OAuth providers list** | `settings/page.tsx` | Derive from server OAuth config |
| **Pricing plans** | `about/page.tsx`, `pricing/page.tsx` | Stripe/products API (pricing may already use billing API) |

### Functions that belong in server logic (not duplicated in UI)

| Concern | Today | Target |
|---------|-------|--------|
| Company search fallback | OpenCorporates proxy + Mongo seed in `companies.routes.ts` | ✅ Done |
| Feed ranking / shuffle | Some client sort | Server query + cursor |
| Read time | May be client-estimated | `server/src/modules/blog/readTimeEstimate.ts` |
| Profile completeness rules | Dialog copy in webapp | Shared Zod + server validation messages |
| ~~Squad category labels~~ | `lib/squadCategory.ts` re-exports | ✅ `packages/shared` + server `Squad.ts` |

---

## Page-by-page notes (size & tech debt)

| Page | Lines (approx.) | Notes |
|------|-----------------|-------|
| `features/settings/SettingsPage.tsx` | ~4800 | Main settings UI; `app/settings/page.tsx` re-exports; nav + shells in `features/settings/` |
| `blogs/write/page.tsx` | ~2000+ | Custom editor chrome; heavy `style={{}}` for overlays |
| `profile/page.tsx` | ~1500+ | Inline analytics bars; duplicate skeleton keys |
| `invite/page.tsx` | ~500 | Many inline retro cards; should use `RetroCard` |
| `u/[username]/page.tsx` | ~700 | Uses shared `ProfileCardSkeleton`, `dateLabels` |
| `bookmarks/page.tsx` | ~550 | Local sort dropdown duplicate |
| `topics/page.tsx` | ~400 | Local sort dropdown + inline Lottie wrapper |
| `page.tsx` (home) | ~530 | Inlined former HomeDashboard/HomeFeed |
| `categories/page.tsx` | ~40 | **Static mock** — replace with API |

---

## API clients (`src/api/`)

| Module | Domain |
|--------|--------|
| `auth.ts` | Auth, profile, OTP |
| `blog.ts` | Posts, publish, engagement |
| `squads.ts`, `bookmarks.ts`, `reposts.ts`, `follow.ts` | Social |
| `reference.ts`, `companies.ts` | Entity autocomplete |
| `tagsExplore.ts` | Topics / explore |
| `billing.ts` | Stripe |
| `legal.ts`, `feedback.ts`, `contact.ts` | CMS / forms |
| `upload.ts`, `github.ts`, `giphy.ts`, `unsplash.ts` | Media & integrations |
| `notifications.ts` | User inbox (`GET /api/notifications`) |

---

## Zustand stores (`src/store/`)

| Store | Persisted | Role |
|-------|-----------|------|
| `auth.ts` | Yes | User, tokens, profile patches |
| `theme.ts` | Yes | Light/dark |
| `customFeeds.ts` | Yes | Home feed rules |
| `sidebar.ts`, `searchDialog.ts`, `authDialog.ts`, `ui.ts` | Partial | Chrome state |
| `toast.ts`, `uiProcessingLock.ts` | No | Feedback / global lock |

---

## Refactor priority (suggested)

1. ~~**P0 — Data:** Wire `/categories` to blog taxonomy API; replace notification placeholders.~~ ✅ Done
2. ~~**P1 — UI tokens:** `retro-card`, `retro-card-lg`, `retro-label`, etc. in `globals.css` + `lib/retroUi.ts`; migrated error, not-found, wallet, about, legal, FeaturedCategoryCard.~~ ✅ Done
3. ~~**P1 — Components:** `RetroSortDropdown`; `FullWidthSegmentedControl` in `components/ui`.~~ ✅ Done
4. ~~**P2 — Settings:** `app/settings/page.tsx` → `features/settings/` (nav config, shared shells, main `SettingsPage.tsx`).~~ ✅ Done
5. ~~**P2 — Shared enums:** Employment/location types, squad categories, blog languages via `packages/shared` synced with server Zod.~~ ✅ Done
6. ~~**P3 — About / marketing:** CMS-driven content for journey, plans, team.~~ ✅ Done

---

## Local development

```bash
cd webapp
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL, etc.
npm run dev                  # http://localhost:3001
```

Ensure the **server** is running so Mongo seeds (`ensureCmsReferenceSeeds`, taxonomy, legal) populate reference data on first connect.

---

## Related server modules

| Seed / API | Path |
|------------|------|
| CMS reference data | `server/src/modules/cms/ensureCmsReferenceSeeds.ts` |
| Marketing (About page) | `server/src/modules/cms/ensureMarketingContentSeeds.ts`, `GET /api/marketing/about` |
| Blog taxonomy | `server/src/modules/blog/ensureBlogTaxonomySeeds.ts` |
| Legal policies | `server/src/modules/legal/ensureLegalPoliciesSeed.ts` |
| Feedback categories | `server/src/modules/feedback/ensureFeedbackCategorySeeds.ts` |
| Reference search | `GET /api/reference/entities`, `/api/reference/tech-stack` |
| Notifications (stub) | `GET /api/notifications`, `POST /api/notifications/read-all` |

---

*Last updated: audit of `webapp/src` — custom CSS patterns, duplicate UI, hardcoded catalogs, and full App Router map.*
