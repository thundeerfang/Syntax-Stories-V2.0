# API contracts (`webapp/src/contracts`)

TypeScript **request/response shapes** for every Syntax Stories REST API the webapp calls. These are compile-time contracts only — HTTP clients live in [`src/api/`](../api/).

## How to use

```ts
import type { BlogPostResponse } from '@contracts/blogApi';
// or
import type { SquadSummary, SendOtpPayload } from '@contracts';
```

| Import alias   | Resolves to                                            |
| -------------- | ------------------------------------------------------ |
| `@contracts/*` | `./src/contracts/*`                                    |
| `@/api/*`      | Client implementations (re-export many contract types) |

**Sync rule:** When the server changes a JSON field, update the matching `*Api.ts` here and the handler in `server/src/routes/` or `server/src/modules/`. Auth and legal also exist under `server/src/shared/contracts/` for deploys that only ship the server.

**Related types:** Blog block/editor and public feed shapes live in [`src/types/blog.ts`](../types/blog.ts) (`Block`, `PublicFeedPost`, `PublicBlogPostDetail`, …).

---

## Module index

| File                                           | Base path                                     | Client                                                                                                         |
| ---------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`authApi.ts`](./authApi.ts)                   | `/auth/*`                                     | [`api/auth.ts`](../api/auth.ts)                                                                                |
| [`profileApi.ts`](./profileApi.ts)             | `/auth/me`, `/auth/profile`, `/auth/parse-cv` | [`api/auth.ts`](../api/auth.ts)                                                                                |
| [`legalApi.ts`](./legalApi.ts)                 | `/api/v1/legal/*`                             | [`api/legal.ts`](../api/legal.ts)                                                                              |
| [`blogApi.ts`](./blogApi.ts)                   | `/api/blog/*`                                 | [`api/blog.ts`](../api/blog.ts)                                                                                |
| [`tagsExploreApi.ts`](./tagsExploreApi.ts)     | `/api/blog/tags/explore`                      | [`api/tagsExplore.ts`](../api/tagsExplore.ts)                                                                  |
| [`squadsApi.ts`](./squadsApi.ts)               | `/api/squads/*`                               | [`api/squads.ts`](../api/squads.ts)                                                                            |
| [`bookmarksApi.ts`](./bookmarksApi.ts)         | `/api/bookmarks/*`                            | [`api/bookmarks.ts`](../api/bookmarks.ts)                                                                      |
| [`repostsApi.ts`](./repostsApi.ts)             | `/api/reposts/*`                              | [`api/reposts.ts`](../api/reposts.ts)                                                                          |
| [`followApi.ts`](./followApi.ts)               | `/api/follow/*`                               | [`api/follow.ts`](../api/follow.ts)                                                                            |
| [`uploadApi.ts`](./uploadApi.ts)               | `/api/upload/*`                               | [`api/upload.ts`](../api/upload.ts)                                                                            |
| [`notificationsApi.ts`](./notificationsApi.ts) | `/api/notifications/*`                        | [`api/notifications.ts`](../api/notifications.ts)                                                              |
| [`marketingApi.ts`](./marketingApi.ts)         | `/api/marketing/*`                            | [`api/marketing.ts`](../api/marketing.ts)                                                                      |
| [`billingApi.ts`](./billingApi.ts)             | `/api/billing/*`                              | [`api/billing.ts`](../api/billing.ts)                                                                          |
| [`feedbackApi.ts`](./feedbackApi.ts)           | `/api/feedback/*`                             | [`api/feedback.ts`](../api/feedback.ts)                                                                        |
| [`contactApi.ts`](./contactApi.ts)             | `/api/contact`                                | [`api/contact.ts`](../api/contact.ts)                                                                          |
| [`companiesApi.ts`](./companiesApi.ts)         | `/api/companies/search`                       | [`api/companies.ts`](../api/companies.ts)                                                                      |
| [`githubApi.ts`](./githubApi.ts)               | `/api/github/*`                               | [`api/github.ts`](../api/github.ts), [`api/auth.ts`](../api/auth.ts) (import-batch)                            |
| [`referenceApi.ts`](./referenceApi.ts)         | `/api/reference/*`                            | [`api/reference.ts`](../api/reference.ts)                                                                      |
| [`analyticsApi.ts`](./analyticsApi.ts)         | `/api/analytics/*`                            | [`api/analytics.ts`](../api/analytics.ts)                                                                      |
| [`webhooksApi.ts`](./webhooksApi.ts)           | `/api/webhooks/*`                             | [`api/operationalHeartbeat.ts`](../api/operationalHeartbeat.ts), [`api/sessionPing.ts`](../api/sessionPing.ts) |
| [`commonApi.ts`](./commonApi.ts)               | (shared envelopes)                            | —                                                                                                              |

---

## Endpoint catalog

Paths are relative to `NEXT_PUBLIC_API_BASE_URL` (or same-origin `/api` when unset). **Auth** = Bearer token required unless noted.

### Auth — [`authApi.ts`](./authApi.ts), [`profileApi.ts`](./profileApi.ts)

| Method | Path                         | Auth     | Types                                                    |
| ------ | ---------------------------- | -------- | -------------------------------------------------------- |
| POST   | `/auth/send-otp`             | —        | `SendOtpPayload` → `SendOtpResponse`                     |
| POST   | `/auth/signup-email`         | —        | `SignUpEmailPayload` → `SendOtpResponse`                 |
| POST   | `/auth/verify-otp`           | —        | `VerifyOtpPayload` → `VerifyOtpResponse`                 |
| POST   | `/auth/2fa/verify-login`     | —        | → `VerifyTwoFactorLoginResponse`                         |
| POST   | `/auth/oauth/exchange`       | —        | `OAuthExchangeRequestBody` → `OAuthExchangeResponseBody` |
| POST   | `/auth/refresh`              | cookie   | → `RefreshTokenResponseBody`                             |
| POST   | `/auth/logout`               | optional | → `SimpleSuccessMessage`                                 |
| POST   | `/auth/revoke-session`       | ✓        | → `SimpleSuccessMessage`                                 |
| GET    | `/auth/me`                   | ✓        | → `AccountResponseJson` / `AuthUser`                     |
| PATCH  | `/auth/profile`              | ✓        | `UpdateProfilePayload` → `AccountResponseJson`           |
| PATCH  | `/auth/profile/:section`     | ✓        | section patch → account user                             |
| POST   | `/auth/parse-cv`             | ✓        | multipart → `ParseCvResponse`                            |
| POST   | `/auth/disconnect/:provider` | ✓        |                                                          |
| POST   | `/auth/email-change/*`       | ✓        |                                                          |
| GET    | `/auth/altcha/challenge`     | —        | Altcha (not typed here)                                  |

### Legal — [`legalApi.ts`](./legalApi.ts)

| Method | Path                                   | Auth | Types                                                             |
| ------ | -------------------------------------- | ---- | ----------------------------------------------------------------- |
| GET    | `/api/v1/legal/policies/:kind`         | —    | → `PublishedPolicyResponse`                                       |
| GET    | `/api/v1/legal/me/status`              | ✓    | → `LegalMeStatusResponse`                                         |
| POST   | `/api/v1/legal/accept-intent`          | ✓    | `PostAcceptIntentBody` → `PostAcceptIntentResponse`               |
| POST   | `/api/v1/legal/accept`                 | ✓    | `PostAcceptBody` → `PostAcceptResponse`                           |
| POST   | `/api/v1/legal/data-deletion-requests` | ✓    | `PostDataDeletionRequestBody` → `PostDataDeletionRequestResponse` |

### Blog — [`blogApi.ts`](./blogApi.ts)

| Method                | Path                                | Auth     | Notes                           |
| --------------------- | ----------------------------------- | -------- | ------------------------------- |
| GET                   | `/api/blog/taxonomy`                | optional | categories + tags               |
| GET                   | `/api/blog/tags/explore`            | —        | see `tagsExploreApi`            |
| GET                   | `/api/blog/feed`                    | optional | `PublicFeedPost[]`              |
| GET                   | `/api/blog/u/:username/posts`       | optional |                                 |
| GET                   | `/api/blog/p/:username/:slug`       | optional | `PublicBlogPostDetail`          |
| POST                  | `/api/blog/p/.../respect`           | ✓        | toggle respect                  |
| POST                  | `/api/blog/p/.../repost`            | ✓        |                                 |
| POST                  | `/api/blog/p/.../bookmark`          | ✓        |                                 |
| POST                  | `/api/blog/engagement/viewer-state` | ✓        | `BlogEngagementViewerStateBody` |
| POST                  | `/api/blog/p/.../read/*`            | ✓        | read tracking                   |
| GET/POST/PATCH/DELETE | `/api/blog/p/.../comments`          | mixed    | `PublicBlogComment`             |
| POST                  | `/api/blog`                         | ✓        | `CreatePostPayload`             |
| GET/PUT               | `/api/blog/draft`                   | ✓        | `GetDraftResponse`              |
| GET/PUT/DELETE        | `/api/blog/post/:postId`            | ✓        | `BlogPostResponse`              |

### Squads — [`squadsApi.ts`](./squadsApi.ts)

| Method           | Path                          | Auth     |
| ---------------- | ----------------------------- | -------- |
| GET              | `/api/squads`                 | —        |
| GET              | `/api/squads/mine`            | ✓        |
| POST             | `/api/squads`                 | ✓        |
| GET/PATCH/DELETE | `/api/squads/s/:slug`         | mixed    |
| POST             | `/api/squads/s/:slug/join`    | ✓        |
| POST             | `/api/squads/s/:slug/leave`   | ✓        |
| GET              | `/api/squads/s/:slug/feed`    | optional |
| GET              | `/api/squads/s/:slug/members` | optional |
| POST             | `/api/squads/s/:slug/shares`  | ✓        |
| POST/DELETE      | `/api/squads/s/:slug/pins`    | ✓        |

### Bookmarks — [`bookmarksApi.ts`](./bookmarksApi.ts)

| Method | Path                             | Auth |
| ------ | -------------------------------- | ---- |
| GET    | `/api/bookmarks/groups`          | ✓    |
| POST   | `/api/bookmarks/groups`          | ✓    |
| PATCH  | `/api/bookmarks/groups/:groupId` | ✓    |
| DELETE | `/api/bookmarks/groups/:groupId` | ✓    |
| GET    | `/api/bookmarks/posts`           | ✓    |

### Reposts — [`repostsApi.ts`](./repostsApi.ts)

| Method | Path                 | Auth |
| ------ | -------------------- | ---- |
| GET    | `/api/reposts/posts` | ✓    |

### Follow — [`followApi.ts`](./followApi.ts)

| Method      | Path                              | Auth |
| ----------- | --------------------------------- | ---- |
| GET         | `/api/follow/search`              | —    |
| GET         | `/api/follow/profile/:username`   | —    |
| GET         | `/api/follow/counts/:username`    | —    |
| GET         | `/api/follow/followers/:username` | —    |
| GET         | `/api/follow/following/:username` | —    |
| POST/DELETE | `/api/follow/:username`           | ✓    |
| GET         | `/api/follow/check/:username`     | ✓    |

### Upload — [`uploadApi.ts`](./uploadApi.ts)

| Method | Path                       | Auth        |
| ------ | -------------------------- | ----------- |
| POST   | `/api/upload/avatar`       | ✓ multipart |
| POST   | `/api/upload/cover`        | ✓           |
| POST   | `/api/upload/media`        | ✓           |
| POST   | `/api/upload/company-logo` | ✓           |
| POST   | `/api/upload/school-logo`  | ✓           |
| POST   | `/api/upload/org-logo`     | ✓           |

### Notifications — [`notificationsApi.ts`](./notificationsApi.ts)

| Method | Path                          | Auth |
| ------ | ----------------------------- | ---- |
| GET    | `/api/notifications`          | ✓    |
| POST   | `/api/notifications/read-all` | ✓    |

### Marketing — [`marketingApi.ts`](./marketingApi.ts)

| Method | Path                   | Auth                     |
| ------ | ---------------------- | ------------------------ |
| GET    | `/api/marketing/about` | — → `AboutMarketingPage` |

### Billing — [`billingApi.ts`](./billingApi.ts)

| Method | Path                            | Auth |
| ------ | ------------------------------- | ---- |
| GET    | `/api/billing/subscription`     | ✓    |
| POST   | `/api/billing/checkout-session` | ✓    |
| POST   | `/api/billing/verify-checkout`  | ✓    |
| POST   | `/api/billing/portal-session`   | ✓    |
| GET    | `/api/billing/transactions`     | ✓    |

### Feedback & contact

| Method | Path                       | Module                  |
| ------ | -------------------------- | ----------------------- |
| GET    | `/api/feedback/categories` | `feedbackApi`           |
| POST   | `/api/feedback`            | `feedbackApi` multipart |
| POST   | `/api/contact`             | `contactApi`            |

### Reference & companies

| Method | Path                        | Module         |
| ------ | --------------------------- | -------------- |
| GET    | `/api/companies/search`     | `companiesApi` |
| GET    | `/api/reference/entities`   | `referenceApi` |
| GET    | `/api/reference/tech-stack` | `referenceApi` |

### GitHub proxy — [`githubApi.ts`](./githubApi.ts)

| Method | Path                                 | Auth |
| ------ | ------------------------------------ | ---- |
| GET    | `/api/github/repo-info/:owner/:repo` | —    |
| GET    | `/api/github/repos`                  | ✓    |
| POST   | `/api/github/repos/import-batch`     | ✓    |

### Analytics — [`analyticsApi.ts`](./analyticsApi.ts)

| Method | Path                                          | Auth |
| ------ | --------------------------------------------- | ---- |
| POST   | `/api/analytics/profile-view/:username`       | —    |
| GET    | `/api/analytics/profile-overview/:username`   | —    |
| GET    | `/api/analytics/profile/:username/timeseries` | —    |

### Webhooks — [`webhooksApi.ts`](./webhooksApi.ts)

| Method | Path                             | Auth   |
| ------ | -------------------------------- | ------ |
| GET    | `/api/webhooks/operational/ping` | —      |
| GET    | `/api/webhooks/session/ping`     | cookie |

### Health (no contract file yet)

| Method | Path          |
| ------ | ------------- |
| GET    | `/api/health` |
| GET    | `/api/ping`   |

### Admin / help (server-only today)

Mounted under `/api/v1/admin/*` and `/api/v1/help/*` — not yet mirrored in webapp contracts.

---

## External APIs (not backend)

| Service  | Client file                             |
| -------- | --------------------------------------- |
| Giphy    | [`api/giphy.ts`](../api/giphy.ts)       |
| Unsplash | [`api/unsplash.ts`](../api/unsplash.ts) |

---

## Search tips

- **By route:** grep this README or `server/src/routes/index.ts`
- **By type name:** grep `src/contracts/` or import from `@contracts`
- **By feature:** use the module index table above
