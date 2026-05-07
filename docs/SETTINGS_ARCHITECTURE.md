# Settings architecture (updated)

This document describes how **`/settings`** talks to auth state and the API after the profile modularization work, and **what changed compared to the previous approach**.

For step-by-step user flows, see [`SETTINGS_FLOW.md`](./SETTINGS_FLOW.md). For server routes, sections, and versioning, see [`PROFILE_UPDATE_FLOW.md`](./PROFILE_UPDATE_FLOW.md).

**Also see:** [`PROFILE_VERSION_CONFLICT.md`](./PROFILE_VERSION_CONFLICT.md) (409 + draft UX), [`GITHUB_PROJECT_IMPORT_CONTRACT.md`](./GITHUB_PROJECT_IMPORT_CONTRACT.md) (repo deduplication).

---

## Scope

| In scope | Out of scope (same as before) |
|----------|--------------------------------|
| Profile-backed sections under **Account** (edit profile, stack, setup, work, education, certifications, projects, open source) | **Security** (email change, connected accounts) still use `authApi` / `useAuthStore` as implemented in `page.tsx` |
| `updateProfile` / GitHub import used by those sections | **Syntax card**, **notifications** placeholder |

---

## Architecture (current)

```text
┌─────────────────────────────────────────────────────────────────┐
│  settings/page.tsx (client) — NAV_GROUPS + section components    │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
 useSettingsAuthSlice   useAuthStore        authApi (HTTP)
 (profile sections)     (shell / security)   + importGithubReposBatch
         │                   │
         └─────────┬─────────┘
                   ▼
         webapp/src/store/auth.ts
         updateProfile(data, { section? })
           → webapp/src/lib/auth/runProfilePatch.ts
           → merges expectedProfileVersion, PATCH /auth/profile or /auth/profile/:section
           → on 409 PROFILE_VERSION_CONFLICT: refreshUser + PROFILE_VERSION_CONFLICT_MESSAGE
```

### State and re-renders

| Piece | Role |
|--------|------|
| **`useSettingsAuthSlice()`** | `useShallow` selector: `user`, `token`, `updateProfile`, `refreshUser`. Profile **Account** sections subscribe only to this slice so unrelated Zustand fields (e.g. `twoFactor`, `isLoading`) do not force re-renders of every block. |
| **`useAuthStore()`** | Still used where the full store or other slices are needed (e.g. security blocks, layout-level `logout`). |

### Writes: legacy vs section

| UI action | HTTP | Why |
|-----------|------|-----|
| **Edit profile → Save** (basic + social in one submit) | `PATCH /auth/profile` (**no** `section`) | One body carries `fullName`, `bio`, `linkedin`, etc. across **basic** and **social** server sections without two round-trips. |
| Cover / avatar immediate save | `PATCH /auth/profile/basic` | Only `profileImg` / `coverBanner` keys. |
| Stack, setup, work, education, certifications, projects, open source project list | `PATCH /auth/profile/<section>` | Smaller payloads; Zod validates per section. |

Every PATCH includes **`expectedProfileVersion`** (from the store, unless overridden in the payload). The server can return **409** with **`PROFILE_VERSION_CONFLICT`** if another tab/session won the race.

### GitHub (open source)

| Step | API |
|------|-----|
| List repos | `GET /api/github/repos` + `Authorization: Bearer` |
| Turn selected repos into project shapes | **`POST /api/github/repos/import-batch`** with `{ fullNames: string[] }` (max 15), via **`authApi.importGithubReposBatch`** |
| Persist | `updateProfile({ projects, isGitAccount?: true }, { section: 'projects' })` |

---

## Section → server `ProfileUpdateSection`

| Settings section id | Component | `updateProfile` option | Server section |
|---------------------|-----------|-------------------------|----------------|
| `edit-profile` (Save all) | `EditProfileContent` | *(none — legacy)* | `legacy` (multi-key) |
| `edit-profile` (upload only) | same | `{ section: 'basic' }` | `basic` |
| `stack-tools` | `StackAndToolsContent` | `{ section: 'stack' }` | `stack` |
| `my-setup` | `MySetupContent` | `{ section: 'setup' }` | `setup` |
| `work-experiences` | `WorkExperiencesContent` | `{ section: 'work' }` | `work` |
| `education` | `EducationContent` | `{ section: 'education' }` | `education` |
| `certifications` | `CertificationsContent` | `{ section: 'certifications' }` | `certifications` |
| `projects` | `ProjectsContent` | `{ section: 'projects' }` | `projects` |
| `open-source` | `OpenSourceContent` | `{ section: 'projects' }` | `projects` (+ `isGitAccount` when linking) |

---

## What was updated (from → to)

### 1. Zustand subscription in profile sections

| Before | After |
|--------|--------|
| `const { user, updateProfile, token } = useAuthStore()` with **no selector** (implicit subscription to **entire** store) | Account profile blocks use **`useSettingsAuthSlice()`** so only `user`, `token`, `updateProfile`, `refreshUser` changes (shallow compare) trigger re-renders |

**Files:** `webapp/src/hooks/useSettingsAuthSlice.ts` (new), `webapp/src/app/settings/page.tsx` (profile section components).

---

### 2. Profile PATCH shape

| Before | After |
|--------|--------|
| All settings saves effectively hit **`PATCH /auth/profile`** only (monolithic partial) | Most saves use **`PATCH /auth/profile/:section`** with `{ section: 'work' \| 'education' \| … }` from the store |
| Stack lived conceptually with “basic” fields in one blob | **Stack** uses dedicated API section **`stack`**; `stackAndTools` is **not** in **`basic`** `PROFILE_SECTION_KEYS` on the server |
| **Edit profile Save** still needed one combined request | Unchanged intent: still **legacy** `PATCH /auth/profile` **without** `section` for the full form |

**Files:** `webapp/src/store/auth.ts`, `webapp/src/app/settings/page.tsx`, server `profile.types.ts` / `profileZodSchemas.ts`.

---

### 3. Optimistic concurrency

| Before | After |
|--------|--------|
| No `profileVersion` on client; no stale-write detection | Account user includes **`profileVersion`** / **`profileUpdatedAt`**; store sends **`expectedProfileVersion`** on every profile PATCH |
| — | **409** + **`PROFILE_VERSION_CONFLICT`** → **`refreshUser()`** + user-visible error to retry |

**Files:** `webapp/src/api/auth.ts` (`AccountUser`, `normalizeUser`), `webapp/src/store/auth.ts`, server `User` model + `profile.repository` + `profile.service`.

---

### 4. GitHub → projects (open source)

| Before | After |
|--------|--------|
| **Per repo:** `GET /api/github/repo/:fullName` for each add | **Batch:** `authApi.importGithubReposBatch` → **`POST /api/github/repos/import-batch`** (still one list fetch via `GET /api/github/repos`) |
| Same `updateProfile({ projects })` without section | **`updateProfile(..., { section: 'projects' })`**; can include **`isGitAccount: true`** in the **projects** section body |

**Files:** `server/src/routes/github.routes.ts`, `webapp/src/api/auth.ts`, `webapp/src/app/settings/page.tsx` (`OpenSourceContent`).

---

### 5. Shared client contracts

| Before | After |
|--------|--------|
| `profileBasicPatchSchema` included **`stackAndTools`** | **`stackAndTools`** removed from **basic**; new **`profileStackPatchSchema`** mirrors **`PATCH …/stack`** |
| `profileProjectsPatchSchema` only `projects` / `openSourceContributions` | Optional **`isGitAccount`** + refine aligned with server **`updateProfileProjectsSchema`** |

**Files:** `webapp/packages/shared/profile.schema.ts`, `webapp/src/api/auth.ts` (re-exports).

---

### 6. Documentation

| Before | After |
|--------|--------|
| `SETTINGS_FLOW.md` described monolithic `updateProfile` and per-repo GitHub GET | Updated for **slices**, **sections**, **versioning**, **import-batch** |
| `PROFILE_UPDATE_FLOW.md` listed **basic** as including `stackAndTools`; no stack route / version / batch | Updated **section table**, **stack**, **`expectedProfileVersion`**, **409**, **GitHub batch**, webapp store behavior |

**Files:** `docs/SETTINGS_FLOW.md`, `docs/PROFILE_UPDATE_FLOW.md`.

---

## Key file index

| Path | Purpose |
|------|---------|
| `webapp/src/app/settings/page.tsx` | All section UIs; calls `updateProfile` with the patterns above |
| `webapp/src/hooks/useSettingsAuthSlice.ts` | Shallow auth slice for profile sections |
| `webapp/src/store/auth.ts` | Thin `updateProfile` delegating to **`runProfilePatch`** |
| `webapp/src/lib/auth/runProfilePatch.ts` | Version merge, 401 retry, 409 → `refreshUser` + error message |
| `webapp/src/lib/githubProjectIdentity.ts` | GitHub repo dedupe helpers (see **GitHub contract** doc) |
| `webapp/src/api/auth.ts` | `updateProfile`, `updateProfileSection`, `importGithubReposBatch`, types |
| `webapp/packages/shared/profile.schema.ts` | Shared Zod DTOs (basic / stack / projects / …) |
| `server/src/modules/profile/profile.types.ts` | `PROFILE_SECTION_KEYS`, `ProfileUpdateSection` |
| `server/src/routes/github.routes.ts` | `POST /repos/import-batch` |

---

---

## Implemented improvements (high value)

| # | Topic | What we did |
|---|--------|-------------|
| 1 | **409 + drafts** | Documented in [`PROFILE_VERSION_CONFLICT.md`](./PROFILE_VERSION_CONFLICT.md): `refreshUser` updates store **`user` only**; React draft state may stay stale until re-save or re-sync. |
| 2 | **Mongo atomic version** | `applyProfileAtomic` uses one **`findOneAndUpdate`** with **`$set` + `$inc: { profileVersion: 1 }`**; strips reserved keys from `$set`; JSDoc states atomicity. |
| 3 | **Mutation wrapper split** | Logic lives in **`runProfilePatch`**; **`useAuthStore.updateProfile`** wires Zustand `get` / `set` / `refreshUser` only. |
| 4 | **Duplicate repo contract** | [`GITHUB_PROJECT_IMPORT_CONTRACT.md`](./GITHUB_PROJECT_IMPORT_CONTRACT.md); batch API dedupes case-insensitive **`fullNames`**; client uses **`projectMatchesGithubRepo`**. |

---

*This file is the architecture + changelog-style delta for settings-related profile work. Product flows remain in `SETTINGS_FLOW.md`.*
