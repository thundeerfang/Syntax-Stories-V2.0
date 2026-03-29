# Profile update flow

How profile data moves between the **webapp**, **Express API**, and **MongoDB** for authenticated users, and how the **profile domain** is structured after modularization (section services, section routes, shared Zod DTOs).

## Overview

- **Source of truth**: `User` document in MongoDB (`server/src/models/User.ts`).
- **Primary write (full)**: `PATCH /auth/profile` with a JSON body (partial updates, all allowed keys).
- **Preferred write (section)**: `PATCH /auth/profile/:section` with a body that only contains keys for that section (smaller payloads, tighter Zod).
- **Auth**: `Authorization: Bearer <accessToken>` (JWT).
- **Images**: uploaded via `POST /api/upload/*`; returned URLs are saved via profile PATCH (legacy or **basic** section).
- **API envelope (success)**: `GET /auth/me` and profile PATCH responses return `{ success: true, data: { user } }`. The webapp unwraps via `unwrapAccountUserPayload()` in `webapp/src/api/auth.ts`.
- **API envelope (errors, profile routes)**: `{ success: false, code, message, details? }` (e.g. `USERNAME_TAKEN`, `VALIDATION_ERROR`). Legacy `error` is still present on some older auth validators where noted in code.

## Architecture style

Layered modular monolith:

```text
UI → Zustand (session) → authApi → Express (/auth, /api/upload, /api/github)
     → verifyToken → Joi (profile body) → profile.controller
     → profile.service (+ section *.service.ts) → profile.repository → MongoDB
     → emitAppEvent('profile.updated', { section, ... }) → audit listener
```

**Profile module** (`server/src/modules/profile/`):

| File / area | Role |
|-------------|------|
| `profile.controller.ts` | `me`, `updateProfile`, `updateProfileSection`, `parseCv`; standardized error JSON; write timing log for PATCH. |
| `profile.service.ts` | Orchestrates picks, normalization, persist, events (`legacy` vs section). |
| `profile-basic.service.ts` | Stack cap + username uniqueness / lowercase. |
| `profile-work.service.ts` | `workId` assignment. |
| `profile-education.service.ts` | `eduId` / `refCode`. |
| `profile-certifications.service.ts` | `certId` / `certValType`. |
| `profile-projects.service.ts` | `prjLog` on projects. |
| `profile-social.service.ts` | Boundary for social fields (Zod validates shape in middleware). |
| `profile-setup.service.ts` | Boundary for `mySetup` (Zod validates shape in middleware). |
| `profile.repository.ts` | Persistence + **semantic** `updateBasic` / `updateWork` / … / `updateBySection` (all currently delegate to `updateById`). |
| `profile.mapper.ts` | **Response firewall**: `toAccountUser` (alias of `mapUserDocumentToApiUser`), `toPublicProfile` (email stripped — use when wiring public reads through this layer). |
| `profile.types.ts` | `ProfileSections`, `ProfileUpdateSection`, `PROFILE_SECTION_KEYS`, `ProfileErrorCode`. |
| `profile.audit.listener.ts` | Subscribes to `profile.updated`; audit metadata includes `section`. |

**Auth module** (`server/src/modules/auth/`): OTP, refresh, OAuth, etc. — not profile business rules.

**Shared contracts (Zod)** (`packages/shared/profile.schema.ts`): lighter DTOs for the webapp; **server canonical validation** lives in `server/src/middlewares/auth/profileZodSchemas.ts` (nested work/education/projects, OTP, etc.).

## Base URLs

| Concern | Mount | Registration |
|--------|--------|----------------|
| Auth + profile JSON | `/auth/*` | `server/src/bootstrap/registerAuthModuleRoutes.ts` → `app.use('/auth', authRoutes)` |
| Multipart uploads | `/api/upload/*` | `registerUploadRoutes` |
| Static files | `/uploads/*` | local disk |

**Webapp** uses `{NEXT_PUBLIC_API_BASE_URL}/auth/...` (`getAuthBase()` in `webapp/src/api/auth.ts`).

## Backend routes (profile-related)

Defined in `server/src/modules/auth/auth.routes.ts` (mounted at `/auth`). Handlers: `server/src/modules/profile/profile.controller.ts`.

| Method | Path | Middleware | Purpose |
|--------|------|------------|---------|
| `GET` | `/auth/me` | `verifyToken` | Current user (account projection). |
| `PATCH` | `/auth/profile` | `verifyToken` → `rateLimitUpdateProfile` → `updateProfileValidation` → `updateProfile` | Legacy “all keys” update. |
| `PATCH` | `/auth/profile/:section` | `verifyToken` → `rateLimitUpdateProfile` → `updateProfileSectionBodyValidation` → `updateProfileSection` | Section-scoped update (`section` = `basic` \| `social` \| `work` \| `education` \| `certifications` \| `projects` \| `setup`). |
| `POST` | `/auth/parse-cv` | `verifyToken` + multer PDF | Parse CV; **does not** persist. |

**Section → keys** (see `PROFILE_SECTION_KEYS` in `profile.types.ts`):

- **basic** — `fullName`, `username`, `bio`, `profileImg`, `coverBanner`, `job`, `portfolioUrl`, `stackAndTools`, OAuth flags.
- **social** — `linkedin`, `instagram`, `github`, `youtube`.
- **work** — `workExperiences`.
- **education** — `education`.
- **certifications** — `certifications`.
- **projects** — `projects`, `openSourceContributions` (body must include at least one).
- **setup** — `mySetup`.

**Validation**: OTP + signup + verify + full profile — Zod in `server/src/middlewares/auth/authValidation.ts` (re-exports `profileZodSchemas`). Per-section profile — `profileSection.validation.ts` + `profileZodSchemas.ts` (via `updateProfileSectionBodyValidation`). Helpers: `zodFormat.ts` (`formatZodError`).

## Domain events

`emitAppEvent('profile.updated', { req, actorId, updates, currentProfile, updatedProfile, section })` where `section` is `ProfileUpdateSection | 'legacy'`. Typed as `ProfileUpdatedPayload` in `server/src/shared/events/appEvents.ts` (alias `ProfileUpdatedEvent`). The audit listener logs section on the aggregate `PROFILE_UPDATED` entry.

## Repository semantics

`profileRepository.updateBySection(userId, section, updates)` routes to `updateBasic`, `updateSocial`, `updateWork`, etc. Today each calls `updateById`; the split is for **intent** and future multi-collection transactions (not required yet).

## Upload flow (images)

1. Client `POST` `/api/upload/avatar` | `cover` | `media` with Bearer token.
2. **Magic-byte** check: `imageBufferMatchesClaimedMime()` in `server/src/config/uploadValidation.ts`.
3. **Sharp** metadata: **megapixel** cap (`MAX_IMAGE_PIXELS`) and **max edge** (`MAX_IMAGE_EDGE_PX` = 8192) via `imageDimensionsAllowed()` before processing.
4. Sharp resize / encode; URL returned under `/uploads/...`.
5. Client saves URL via `PATCH /auth/profile` or `PATCH /auth/profile/basic`.

**Not implemented yet**: explicit upload queue / concurrency cap (optional hardening).

## Webapp stack

| Layer | Location | Role |
|-------|-----------|------|
| HTTP | `webapp/src/api/auth.ts` | `updateProfile`, **`updateProfileSection`**, unwrap, `ProfileUpdateSection` re-export, optional Zod re-exports from `@syntax-stories/shared`. |
| Path alias | `webapp/tsconfig.json` | `@syntax-stories/shared` → `../packages/shared/index.ts` |
| State | `webapp/src/store/auth.ts` | `updateProfile(data, { section? })` — section uses section URL. |
| Mutations | `webapp/src/hooks/useUpdateProfileMutation.ts` | `mutate({ data, section? })`. |
| Providers | `QueryProvider` + `app/providers.tsx` | React Query. |

**Note**: Settings UI may still call `updateProfile` without `section` (legacy one-shot). Flows that combine **`projects` + `isGitAccount`** should keep using **legacy** `PATCH /auth/profile` until split into two calls or a dedicated contract.

## Rate limiting & observability

- **Rate limit**: `rateLimitUpdateProfile` on both legacy and section PATCH routes (`auth.config.RATE_LIMIT_UPDATE_PROFILE`, Redis prefix `rl:updateprofile:`).
- **Timing**: JSON log line `{ "msg": "profile.write.timing", "section", "totalMs" }` after each profile PATCH handler (end-to-end handler time, not Zod/DB split).

## Priority checklist (your roadmap) — status

| # | Item | Status |
|---|------|--------|
| 1 | Split `profile.service` by section | **Done** — `profile-*-service.ts` + orchestrator in `profile.service.ts`. |
| 2 | Split `PATCH` into section endpoints | **Done** — `PATCH /auth/profile/:section`. |
| 3 | Shared Zod DTOs | **Done** — `packages/shared/profile.schema.ts` + server `profileZodSchemas.ts` (deep rules). |
| 4 | Semantic repository methods | **Done** — `updateWork`, `updateProjects`, `updateBySection`, etc. |
| 5 | Typed events | **Done** — `ProfileUpdatedPayload` + `section`; `ProfileUpdatedEvent` alias. |
| 6 | Mapper as response firewall | **Partial** — `toAccountUser`, `toPublicProfile`; ensure new routes use mappers only. |
| 7 | Mongo transactions | **Future** — when projects/live data split across collections. |
| 8 | Upload hardening | **Partial** — magic bytes + megapixels + max edge; queue TBD. |
| 9 | Global error envelope | **Partial** — profile PATCH + section validation use `{ success, code, message }`; other modules unchanged. |
| 10 | TanStack Query for profile writes | **Partial** — `useUpdateProfileMutation` supports `section`; settings can migrate call-by-call. |
| 11 | Rate limit profile writes | **Done** — see above. |
| 12 | Observability | **Partial** — handler-level timing log; fine-grained validation/db timers optional later. |

---

*Last updated: section profile services & routes, `PROFILE_SECTION_KEYS`, shared Zod package, semantic repository + `updateBySection`, `profile.updated.section`, audit metadata, rate limit on profile PATCH, profile error codes, upload max edge + megapixels, webapp `updateProfile(..., { section })` + mutation hook.*
