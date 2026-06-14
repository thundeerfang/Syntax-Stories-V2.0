# Webapp component structure & inline consolidation guide

> **Full repo layout, target architecture, scaling handbook, and priority action plan:** [WEBAPP_STRUCTURE.md](./WEBAPP_STRUCTURE.md) (Part IV = highest-impact items only)

This document maps `webapp/src/components`, flags **single-use** files that should be folded into their parent page or parent component, and lists **shared** primitives that should stay separate.

> **Generated from import analysis** (May 2026). Re-run after large refactors: `npm run arch:check` or [knip](https://github.com/webpro/knip) for unused exports.

---

## 1. Folder layout

```
webapp/src/
├── app/                          # Next.js routes (pages, layouts, loading.tsx)
├── features/                     # Feature modules (auth dialog, settings sections)
├── api/                          # API clients
├── hooks/                        # Shared hooks
├── lib/                          # Utilities (no UI)
├── store/                        # Zustand stores
└── components/                   # ← This guide
    ├── ui/                       # App-wide primitives — button/, dialog/, editor/, lottie/, …
    ├── retroui/                  # Retro design-system layer (Input, Label, charts)
    ├── layout/                   # Shell, nav, footer, rail headers
    │   ├── shell/                # LayoutShell → MainLayout → AppShellChrome
    │   ├── nav/                  # Navbar, SidebarDrawer, AccountDropdown
    │   ├── footer/               # Footer, OperationalStatusIndicator
    │   └── rail/                 # ShellPageIntroHeader, RailSectionSubheader, …
    ├── blog/                     # Blog cards, post detail, write flow
    ├── explore/                  # Explore page blocks
    ├── trending/                 # Trending page blocks
    ├── squads/                   # Squad discover, directory, dialogs
    ├── profile/                  # Profile UI + dialog/
    ├── legal/                    # Legal policy chrome
    ├── skeletons/                # Route & page skeletons
    ├── topics/                   # Category follow, rank pills
    ├── tags/                     # HashtagBadgeLink
    ├── search/                   # Search dialog
    ├── feedback/                 # Feedback dialog
    ├── home/                     # Home-only dialogs
    ├── effects/                  # Global engagement overlays
    ├── connectivity/             # Offline gate
    ├── docs/                     # Docs layout nav
    ├── upload/                   # Image crop upload
    ├── icons/                    # SocialProviderIcons
    ├── providers/                # QueryProvider
    ├── appwrite/                 # AppwritePing
    ├── auth/                     # OAuthBrowserCallback
    └── StoreHydration.tsx        # Root store hydrate
```

**Related UI outside `components/`**

| Path                              | Role                                          |
| --------------------------------- | --------------------------------------------- |
| `src/features/auth/components/`   | Auth dialog, Altcha, steps                    |
| `src/features/settings/`          | Settings page sections                        |
| `src/app/settings/settings-list/` | Per-settings cards (Education, OpenSource, …) |

---

## 2. When to keep a file vs inline

| Situation                                                       | Action                                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Used on **one route only** (`app/.../page.tsx` or `layout.tsx`) | **Inline** into that page (or a single `page.client.tsx` beside it).                                                                |
| Used by **one parent component** only                           | **Inline** at the bottom of the parent file as `function XxxSection()` (not exported).                                              |
| Used **2+ unrelated routes/features**                           | **Keep** a shared file under `components/`.                                                                                         |
| Primitive (Button, Dialog, Skeleton, form field)                | **Always keep** in `ui/` or `retroui/`.                                                                                             |
| File would exceed **~500–700 lines** after merge                | Co-locate one file next to the route: `app/foo/_sections/Bar.tsx` — still one import from the page, but avoid a 2k-line `page.tsx`. |

**Naming after inline:** drop the redundant prefix when the symbol lives inside the page, e.g. `BlogPostSidebarStats` → `SidebarStats` inside `blogs/[username]/[slug]/page.tsx`.

---

## 3. Tier A — Page-only components (inline into `app/`)

Each row is imported **only** by the listed route/layout. Target: merge into that file (or one sibling `*.client.tsx`).

| Component                                      | Merge into                                                      |
| ---------------------------------------------- | --------------------------------------------------------------- |
| ~~`explore/ExplorePageContent`~~               | **Done** → `app/explore/_explorePageContent.tsx`                |
| ~~`trending/TrendingPageContent`~~             | **Done** → `app/trending/_trendingPageContent.tsx`              |
| ~~`squads/SquadsDiscoverFeaturedPageContent`~~ | **Done** → `app/squads/featured/_squadsFeaturedPageContent.tsx` |
| ~~`squads/SquadsDiscoverCategoryView`~~        | **Done** → `app/squads/[slug]/_squadSlugSections.tsx`           |
| ~~`squads/SquadMembersDialog`~~                | **Done** → `app/squads/[slug]/_squadSlugSections.tsx`           |
| `squads/SquadsPageSkeleton`                    | `app/squads/page.tsx`                                           |
| `topics/CategoryFollowButton`                  | `app/topics/category/[slug]/page.tsx`                           |
| `profile/ProfileSectionHeader`                 | `app/profile/page.tsx`                                          |
| `profile/dialog/MissingFieldsDialog`           | `app/profile/page.tsx`                                          |
| `profile/UserProfileBlogsContent`              | `app/u/[username]/blogs/page.tsx`                               |
| `legal/UserDataDeletionPanel`                  | `app/(legal)/user-data-deletion/page.tsx`                       |
| `legal/LegalPagesLayout`                       | `app/(legal)/layout.tsx`                                        |
| `docs/DocsBreadcrumb`                          | `app/docs/layout.tsx`                                           |
| `docs/DocsSidebarNav`                          | `app/docs/layout.tsx`                                           |
| `auth/OAuthBrowserCallback`                    | `app/auth/callback/[provider]/page.tsx`                         |
| `ui/BottomToolbar`                             | `app/blogs/write/page.tsx`                                      |
| `ui/Header`, `ui/form-fields`                  | `app/contact/page.tsx`                                          |
| `ui/Tabs`                                      | `app/squads/[slug]/page.tsx`                                    |
| `ui/lottie/ProfileActivityIconLottie`          | `app/profile/page.tsx`                                          |
| `blog/BlogWriteDeployOverlay`                  | `app/blogs/write/page.tsx`                                      |

### Blog post detail — **done** (co-located route module)

Merged into `app/blogs/[username]/[slug]/_blogPostDetailSections.tsx` (imported by `page.tsx`). Removed 8 files from `components/blog/`.

### Root layout — small providers (optional inline)

Used only by `app/layout.tsx` / `app/providers.tsx`:

| Component                         | Note                                                 |
| --------------------------------- | ---------------------------------------------------- |
| `layout/shell/LayoutShell`        | Large — keep file OR split `layout.tsx` + thin shell |
| `StoreHydration`                  | Small — good inline candidate                        |
| `connectivity/ConnectivityGate`   | Small                                                |
| `effects/GlobalEngagementEffects` | Small                                                |
| `search/SearchDialogWrapper`      | Medium                                               |
| `retroui/SonnerToaster`           | Tiny                                                 |
| `appwrite/AppwritePing`           | Tiny                                                 |
| `providers/QueryProvider`         | Tiny → `app/providers.tsx`                           |

---

## 4. Tier B — Single-parent chains (collapse into parent file)

These are used by **one** other component. Fold **child → parent** (bottom-up).

### Explore

```
app/explore/page.tsx
  └── ExplorePageContent          ← Tier A (merge into page)
        ├── ExploreTopSquadsBlock   → inline into ExplorePageContent
        ├── TaxonomyCategoryCard    → inline
        │     └── CategoryMemberCluster → inline into TaxonomyCategoryCard section
        └── FeaturedCategoryCard    (if only used here — verify before merge)
```

### Trending

```
app/trending/page.tsx
  └── TrendingPageContent           ← Tier A
        └── TrendingStackedHero     → inline
```

### Blog card engagement chain

```
blog/BlogCard.tsx
  └── BlogCardEngagementRail        → inline into BlogCard.tsx
        ├── BlogCardSquadChip       → inline
        │     └── SquadPopoverCard  → inline
        └── squads/ShareToSquadDialog → inline
```

### Blog write editor chain

```
ui/BlogWriteEditor.tsx
  ├── blog/CodeBlockEditor          → inline
  ├── blog/MermaidBlockEditor       → inline
  ├── blog/TableBlockEditor         → inline
  │     └── dialog/TableBlockHelpDialog → inline
  └── blog/dialog/ParagraphBlockHelpDialog → inline
```

### Layout shell chain

```
app/layout.tsx
  └── layout/shell/LayoutShell
        ├── MainLayout              → inline (or keep one LayoutShell file)
        │     └── footer/Footer
        │           └── OperationalStatusIndicator → inline into Footer section
        ├── AppShellChrome
        │     ├── nav/Navbar
        │     │     ├── AccountDropdown → inline
        │     │     └── NotificationsDropdown → inline
        │     └── nav/SidebarDrawer → inline
        ├── FloatingActions → inline into LayoutShell
        ├── feedback/FeedbackDialogWrapper
        │     └── FeedbackDialog → inline
        ├── home/NewCustomFeedDialog → inline
        ├── skeletons/RouteLoadingSkeleton → inline
        └── search/SearchDialogWrapper (Tier A root layout)
```

### Squads featured

```
squads/SquadsDiscoverFeaturedPageContent   ← Tier A
  ├── SquadsDiscoverFeaturedRail         → inline
  └── SquadCategoryLaneRow               → inline
```

### Profile / legal / search / feedback

| Parent                               | Child to inline                                                    |
| ------------------------------------ | ------------------------------------------------------------------ |
| `profile/dialog/SyntaxCardDialog`    | `syntax-card/SyntaxCardSquare` → `SyntaxCardMiniHeatmap`           |
| `profile/dialog/MissingFieldsDialog` | `CompleteItemDialog`                                               |
| `legal/LegalPagesLayout`             | `LegalPolicyPageHeader`, `LegalTableOfContents`                    |
| `legal/LegalPolicyHeaderContext`     | `legalPolicyFormat.ts` (move helpers to same file)                 |
| `search/SearchDialogWrapper`         | `SearchDialog`                                                     |
| `feedback/FeedbackDialogWrapper`     | `FeedbackDialog`                                                   |
| `ui/RichParagraphEditor`             | `GifPopoverCard`                                                   |
| `ui/form-fields`                     | `retroui/Label`, `FormField`, `Textarea` (if only via form-fields) |

---

## 5. Tier C — Keep as shared components (3+ importers)

Do **not** inline these; they are cross-cutting primitives or heavily reused.

| Imports | Component                                                                                                                         |
| ------: | --------------------------------------------------------------------------------------------------------------------------------- |
|      26 | `skeletons/PageSkeletons`                                                                                                         |
|      19 | `ui/Dialog`                                                                                                                       |
|      17 | `ui/Button`                                                                                                                       |
|      11 | `icons/SocialProviderIcons`                                                                                                       |
|      11 | `layout/rail/ShellPageIntroHeader`                                                                                                |
|      11 | `ui/BlockShadowButton`                                                                                                            |
|      10 | `blog/BlogCard`                                                                                                                   |
|       9 | `ui/HoverCard`, `ui/LinkPreviewCardContent`                                                                                       |
|       8 | `layout/rail/RailSectionSubheader`, `ui/FormDialog`, `ui/delete/ConfirmDialog`                                                    |
|       7 | `layout/rail/RailFeedEmptyState`, `retroui/Label`                                                                                 |
|       6 | `legal/legalUi`, `ui/lottie/SparkLottie`                                                                                          |
|       5 | `upload/ImageUploadCropDialog`                                                                                                    |
|       4 | `retroui/Input`, `squads/SquadDirectoryCard`, `ui/Skeleton`, …                                                                    |
|       3 | `blog/BlogPostAuthor`, `blog/CompactBlogPostsSwiper`, `ui/BlogWriteEditor`, `squads/SquadDiscoverCard`, `topics/RankCountPill`, … |

**Rule of thumb:** anything under `ui/`, `retroui/`, `skeletons/PageSkeletons`, and `layout/rail/*` stays unless audit shows a single route.

---

## 6. Recommended refactor batches (priority)

| Priority | Batch                                                                              | Files removed (approx.) | Risk     |
| -------- | ---------------------------------------------------------------------------------- | ----------------------- | -------- |
| P0       | Blog post detail → `blogs/[username]/[slug]/_blogPostDetailSections.tsx`           | 8                       | **Done** |
| P1       | BlogCard engagement → `_blogCardEngagement.tsx`                                    | 4                       | **Done** |
| P2       | Explore + Trending → `_explorePageContent.tsx`, `_trendingPageContent.tsx`         | 6                       | **Done** |
| P3       | Squads featured + slug sections                                                    | 5                       | **Done** |
| P4       | Layout shell overlays → `_layoutShellOverlays.tsx`; status in `Footer.tsx`         | 4                       | **Done** |
| P5       | Blog write blocks → `ui/_blogWriteEditorBlocks.tsx`                                | 5                       | **Done** |
| P6       | Profile syntax-card + missing-fields → `_syntaxCardDialog`, `_missingFieldsDialog` | 4                       | **Done** |

After each batch: run `npm run lint` and smoke-test the affected route.

---

## 7. Re-audit after refactors

Use **`npm run arch:check`** (dependency-cruiser + eslint) for layer violations, or **[knip](https://github.com/webpro/knip)** for unused exports and dead files. For single-use component detection, grep importers per file under `src/components` (same approach as the analysis that produced this doc).

---

## 8. Exceptions & cautions

1. **`index.ts` barrels** — `components/layout/index.ts`, `components/ui/index.ts` re-export symbols; the audit follows direct imports. Barrels can hide “single use” — prefer direct imports when inlining.
2. **`'use client'`** — Inlining into a Server Component page requires a single client boundary (`page.client.tsx` or one `'use client'` child). Merge client-only pieces together.
3. **Tests & Storybook** — If you add tests later, colocated `*.test.tsx` next to the page is fine; don’t re-split for one test file.
4. **`PublicUserBlogGrid`** — Currently unused in imports; delete or wire up before merging elsewhere.
5. **Lottie wrappers** (`ui/lottie/*`) — Often single-route; inline only when literally one page imports that lottie.

---

## 9. Target end state

```
app/<route>/page.tsx          # Route + page-only UI (sections as inner functions)
components/ui/                # Design system — see ui/README.md (button/, dialog/, editor/, …)
components/retroui/           # Form/control primitives
components/<domain>/          # Only files used by 2+ routes (BlogCard, SquadDirectoryCard, …)
```

Fewer files, shallower import trees, no “string of single-use wrappers” between a page and its UI.
