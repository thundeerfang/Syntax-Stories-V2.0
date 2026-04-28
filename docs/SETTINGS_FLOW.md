# Settings page (`/settings`) — user flows

How the settings UI is structured and how major flows work: profile, stack, setup, work, education, certifications, projects, open source / GitHub, OAuth, and email security.

**Primary implementation:** `webapp/src/app/settings/page.tsx` (client component).  
**Section cards:** `webapp/src/app/settings/settings-list/*.tsx`.

---

## Entry and auth

- **Route:** `/settings`
- **Guard:** `useRequireAuth()` — unauthenticated users are blocked; a skeleton layout shows while auth hydrates.
- **State:** `useAuthStore()` for shell-level needs (`logout`, etc.). **Profile sections** use `useSettingsAuthSlice()` (`webapp/src/hooks/useSettingsAuthSlice.ts`) — shallow-selected `user`, `token`, `updateProfile`, `refreshUser` so unrelated store updates (e.g. 2FA) do not re-render every section.
- **Visibility sync:** When the document becomes visible, `refreshUser()` runs so the session stays current without a full reload.

---

## URL query parameters

| Query | Behavior |
|--------|-----------|
| `?section=<id>` | Opens the matching sidebar section. `id` must be one of the **section ids** listed below (from `NAV_GROUPS`). |
| `?edit=<index>` | Deep-link for list sections (work, education, certifications, projects). Handlers read the index, then `router.replace` to `?section=…` without `edit` to normalize the URL. |
| `?linked=<provider>` | OAuth link success: toast, `refreshUser()`, URL cleared to `/settings`. |
| `?error=<message>` | OAuth / link failure: error toast, URL cleared. |

---

## Sidebar: section ids

Defined in `NAV_GROUPS` inside `page.tsx`.

### Account

| Section id | Label | Content component |
|------------|--------|-------------------|
| `edit-profile` | Edit Profile | `EditProfileContent` |
| `stack-tools` | Stack & Tools | `StackAndToolsContent` |
| `my-setup` | My Setup | `MySetupContent` |
| `work-experiences` | Work Experiences | `WorkExperiencesContent` |
| `education` | Education | `EducationContent` |
| `certifications` | License & Certifications | `CertificationsContent` |
| `projects` | Projects & Publications | `ProjectsContent` |
| `open-source` | Open Source | `OpenSourceContent` |

### Security

| Section id | Label | Content component |
|------------|--------|-------------------|
| `security-email` | Update email | `SecurityEmailContent` |
| `connected-accounts` | Connected accounts | `ConnectedAccountsContent` |

### Other

| Section id | Label | Notes |
|------------|--------|--------|
| `syntax-card` | Syntax card | `SyntaxCardContent` — static / preview UI |
| `notifications` | Notifications | Placeholder: **“Coming soon.”** |

Switching sections sets a short `contentLoading` state for transition animation (`AnimatePresence` + skeleton).

---

## Account flows

### Edit profile (`edit-profile`)

- Cover and avatar via `UploadCoverDialog` / `UploadProfilePicDialog`; successful uploads update local state and call **`updateProfile` with `{ section: 'basic' }`** for the new URL (cover / avatar live under the **basic** section on the API).
- Text fields: full name, username, portfolio URL.
- **Bio:** `contentEditable` with toolbar (bold / italic / underline, bullet / numbered lists, symbol picker). Stored as markdown-like text (`**bold**`, `*italic*`, `__underline__`); length capped (e.g. 500).
- Social: LinkedIn, GitHub URL, Instagram, YouTube (with URL length helpers from `@/lib/profileLinkLimits`).
- **Save:** one **legacy** `updateProfile({ … })` **without** `section` so a single request can send both **basic** and **social** fields (`PATCH /auth/profile`). The store attaches **`expectedProfileVersion`** from the current user for optimistic concurrency.

### Stack & tools (`stack-tools`)

- Add/remove tech stack via `searchTechStack` and `STACK_AND_TOOLS_MAX`.
- **Save:** `updateProfile({ stackAndTools }, { section: 'stack' })` — stack is **not** part of the `basic` section on the server.

### My setup (`my-setup`)

- List of setup items (`MySetupCard` types); reorder/edit/delete; cap on item count (e.g. 5).
- **Save:** `updateProfile({ mySetup }, { section: 'setup' })`.

### Work experiences (`work-experiences`)

- `WorkExperienceCard` + dialogs for add/edit/delete.
- Location helpers: country / state / city (`@/data/location`), company search (`searchCompaniesWithApi`).
- **Persist:** `updateProfile({ workExperiences }, { section: 'work' })`.
- After handling `?edit=`, URL becomes `?section=work-experiences`.

### Education (`education`)

- `EducationCard`; school/org search (`searchSchools`, etc.).
- **Persist:** `updateProfile({ education }, { section: 'education' })`.
- **Deep link:** `?edit=` then `section=education`.

### License & certifications (`certifications`)

- `CertificationCard`; optional **media / link** rows (URLs must start with `http://` or `https://`).
- **Persist:** `updateProfile({ certifications }, { section: 'certifications' })`.

### Projects & publications (`projects`)

- **Manual projects:** `ProjectCard`; title, description, links/media similar to certifications.
- **GitHub-backed rows:** `source === 'github'`. Lists are split so GitHub entries and manual entries can be ordered/edited consistently.
- **Persist:** `updateProfile({ projects }, { section: 'projects' })`. The **projects** section allows **`isGitAccount`** when needed (e.g. after linking GitHub).
- **Deep link:** `?edit=` then `section=projects`.

### Open source (`open-source`)

- **`OpenSourceContent`:** Focused GitHub import UI (up to **7** repos via `MAX_OPEN_SOURCE_REPOS`).
- Requires `user.isGitAccount`; lists repos via **`GET /api/github/repos`** with `Authorization: Bearer ${token}`.
- **Add:** **`authApi.importGithubReposBatch(token, [fullName])`** (`POST /api/github/repos/import-batch`) returns project payloads in one round-trip (replacing per-repo `GET /api/github/repo/:fullName` for this flow). Then **`updateProfile({ projects, isGitAccount: true }, { section: 'projects' })`**.
- **Remove:** filters by `repoFullName`, **`updateProfile({ projects }, { section: 'projects' })`**.
- Renders `OpenSourceCard` for listed imports.

### Profile version conflicts

- If the server responds with **409** and code **`PROFILE_VERSION_CONFLICT`**, **`runProfilePatch`** calls **`refreshUser()`** and throws a stable message (`PROFILE_VERSION_CONFLICT_MESSAGE`). The store **`user`** matches the server; **local form draft state is not automatically cleared** — see [`PROFILE_VERSION_CONFLICT.md`](./PROFILE_VERSION_CONFLICT.md).

---

## Security flows

### Update email (`security-email`)

- Flow uses **two OTP codes**: one sent to the **current** email, one to the **new** email (`SecurityEmailContent`).
- Verify action confirms identity and completes the change.
- **Copy:** Successful change **terminates OAuth sessions** (Google, GitHub, etc.); user must sign in again with the new email.

### Connected accounts (`connected-accounts`)

- **Connect:** `authApi.getLinkRedirectUrl(token, provider)` for `google` | `github` | `facebook` | `x` | `discord`; then `markOAuthNavigationPending()` and `window.location.href = redirectUrl`.
- **Disconnect:** `authApi.disconnectProvider(token, provider)` — confirms with user; on success, toast and delayed `logout()`.
- UI shows linked flags: `isGoogleAccount`, `isGitAccount`, `isFacebookAccount`, `isXAccount`, `isDiscordAccount`.

---

## Other sections

### Syntax card (`syntax-card`)

- `SyntaxCardContent` — illustrative / marketing-style dev card (not wired to live profile data in the snippet reviewed).

### Notifications (`notifications`)

- Placeholder only: **Coming soon.**

---

## Data and API summary

| Action | Typical API / store |
|--------|---------------------|
| Profile slices | `useSettingsAuthSlice().updateProfile(partial, { section? })` — store merges **`expectedProfileVersion`**; legacy full save omits `section`. |
| OAuth link start | `authApi.getLinkRedirectUrl(token, providerId)` |
| OAuth unlink | `authApi.disconnectProvider(token, provider)` |
| GitHub repo list | `GET …/api/github/repos` with `Authorization: Bearer` |
| GitHub batch → projects | `POST …/api/github/repos/import-batch` body `{ fullNames: string[] }` (max 15) via **`authApi.importGithubReposBatch`** |
| Single repo (API still exists) | `GET …/api/github/repo/:fullName` — not used by Open Source add in the current UI |
| Feedback | `sonner` `toast.*` |

Shared request-shape contracts for profile PATCH bodies live in `webapp/packages/shared/profile.schema.ts` (including **`profileStackPatchSchema`** and **`isGitAccount` on projects**). Server-side canonical validation is in `server/src/middlewares/auth/profileZodSchemas.ts` (see `docs/PROFILE_UPDATE_FLOW.md`).

---

## Key files

| Path | Role |
|------|------|
| `webapp/src/app/settings/page.tsx` | Layout, nav, all section components, query-param effects |
| `webapp/src/app/settings/settings-list/WorkExperienceCard.tsx` | Work UI |
| `webapp/src/app/settings/settings-list/EducationCard.tsx` | Education UI |
| `webapp/src/app/settings/settings-list/CertificationCard.tsx` | Certifications UI |
| `webapp/src/app/settings/settings-list/ProjectCard.tsx` | Projects UI |
| `webapp/src/app/settings/settings-list/OpenSourceCard.tsx` | Open-source list UI |
| `webapp/src/app/settings/settings-list/MySetupCard.tsx` | Setup items |
| `webapp/src/app/settings/settings-list/Header.tsx` | Section headers |
| `webapp/src/app/settings/buttonStyles.ts` | Shared button classes |
| `webapp/src/store/auth.ts` | `updateProfile`, version merge, 409 refresh, user shape |
| `webapp/src/hooks/useSettingsAuthSlice.ts` | Shallow auth slice for settings sections |
| `webapp/src/api/auth.ts` | Auth, profile PATCH, GitHub batch import, link URLs |
| `webapp/src/lib/oauthNavigation.ts` | OAuth redirect guard |

---

## Deployment note

Set **`NEXT_PUBLIC_API_BASE_URL`** to your API origin so GitHub and auth calls resolve in production (e.g. Appwrite Sites, Vercel).
