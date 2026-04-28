# Feedback system

Production feedback flow: dialog, **categories** from MongoDB, **multipart** submit with optional **screenshot**, `imageMasterHandler` (validation + compression + optional ClamAV), ALTCHA for guests, and **India Standard Time (IST)** on category rows and submission metadata.

## Overview

- Users open **Feedback** from the floating action button (or `/feedback`, which opens the same dialog).
- **GET `/api/feedback/categories`** returns active categories (labels, slugs, IST `createdAtIst` / `updatedAtIst`, `createdByLabel` / `updatedByLabel`). Defaults are seeded on DB connect; a future admin panel can add or deactivate categories.
- **POST `/api/feedback`** is **`multipart/form-data`** (not JSON): text fields + optional file field `attachment`.
- Submissions live in **`feedbacksubmissions`** with denormalized `categorySlug` / `categoryLabel`, optional `attachmentUrl` / `attachmentMeta`, plus existing identity and `serverMeta`.
- Notification email uses the same stack as OTP mail; optional **ClamAV** hardens binary uploads when configured.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `FEEDBACK_NOTIFY_EMAIL` | Inbox for feedback notifications. Falls back to `EMAIL_FROM`, `EMAIL_USER`, `RESEND_FROM`. |
| `MONGO_CONN` | MongoDB connection. |
| `ALTCHA_HMAC_KEY` or `JWT_SECRET` | ALTCHA for anonymous feedback. |
| `ALTCHA_REQUIRED` | Stricter ALTCHA behavior when set `true`. |
| `CLAMAV_HOST` | Optional ClamAV daemon host (TCP INSTREAM, default port 3310). If unset, ClamAV step is skipped; Sharp still re-encodes images. |
| `CLAMAV_PORT` | ClamAV TCP port (default `3310`). |
| `CLAMAV_REQUIRED` | If `true`, uploads through `processUploadedImageBuffer` must succeed against ClamAV and `CLAMAV_HOST` must be set. |
| Email stack (`EMAIL_*`, `RESEND_API_KEY`, etc.) | Notification mail. |

## API

### GET `/api/feedback/categories`

Public. Returns `{ success, categories }` where each category includes:

- `id`, `slug`, `label`, `sortOrder`, `active`, `isSystemSeed`
- `createdByLabel`, `updatedByLabel` (e.g. `system` until admin edits exist)
- `createdAtIst`, `updatedAtIst` — formatted with **Asia/Kolkata** on writes (see model pre-save)

### POST `/api/feedback`

- **Content-Type**: `multipart/form-data` (browser sets boundary).
- **Headers**: Optional `Authorization: Bearer <access_token>`. `X-Device-Fingerprint` when present (rate limit).
- **Rate limit**: 20 submissions / hour / IP+fingerprint (Redis-backed when Redis is available).

| Field | Required | Notes |
|-------|----------|--------|
| `categoryId` | yes | 24-char hex MongoDB id of an **active** category. |
| `subject` | yes | 1–200 chars. |
| `description` | yes | 10–5000 chars. |
| `clientMeta` | no | JSON **string** of an object (browser hints). |
| `firstName`, `lastName`, `email` | anonymous only | Ignored when authenticated; server uses account profile. |
| `altcha` | anonymous when ALTCHA configured | Same payload as auth forms. |
| `attachment` | no | Single image: JPEG, PNG, GIF, WebP; max **5 MB** before server processing. |

**Signed-in users**: identity still comes from the user document; multipart identity fields are ignored.

### Client metadata (`clientMeta`)

Same as before: URL, referrer, language, screen, timezone, etc. Send as a JSON string in the multipart field.

### Submission `serverMeta`

- `submittedAtIst` — **Asia/Kolkata** string at submit time
- IP, `X-Forwarded-For`, `User-Agent`, `istTimeZone` label

MongoDB `createdAt` / `updatedAt` remain UTC; prefer `serverMeta.submittedAtIst` and category IST fields for operator-facing copy.

## Categories (MongoDB)

- Collection: **`feedbackcategories`** (`FeedbackCategory` model).
- Seeded slugs (idempotent upserts on connect): `bug-report`, `ux-issue`, `content-quality`, `adult-content`, `feature-suggestion`, `other`.
- `isSystemSeed: true` marks built-ins; admins can add non-system rows later and toggle `active`.

## Attachments and `imageMasterHandler`

Reusable server module: `services/image/imageMasterHandler.ts` (+ `imageMaster.constants.ts`, `services/security/clamScanBuffer.ts`).

Pipeline per upload:

1. Size cap and MIME allow-list; magic-byte check (`uploadValidation.imageBufferMatchesClaimedMime`).
2. **ClamAV** INSTREAM when `CLAMAV_HOST` is set; failures reject upload (`422` for detections).
3. **Sharp**: `failOn: 'error'`, strip re-encode to **WebP** (feedback profile), auto-orient, resize within max edge, strip metadata.

Other callers can reuse `processUploadedImageBuffer(buffer, mime, profile)` with profiles `feedback` | `avatar` | `general` (limits in `IMAGE_MASTER_PROFILES`).

Stored files: `uploads/feedback/*.webp`, public URL `/uploads/feedback/...`.

## Database (`feedbacksubmissions`)

Adds: `categoryId`, `categorySlug`, `categoryLabel`, optional `attachmentUrl`, `attachmentMeta` (`mime`, `width`, `height`, `bytesIn`, `bytesOut`, `originalName`).

## Email

- Subject line includes category label.
- Body lists category and attachment URL when present.

## Frontend

- Loads categories when the dialog opens; category **select** required.
- Optional **Screenshot** section: client validates type and 5 MB; server enforces again and runs the image master pipeline.
- Submit uses `FormData` + `submitFeedbackMultipart` in `webapp/src/api/feedback.ts`.

## Security notes

- Never trust client identity when JWT is valid.
- ALTCHA + rate limits for anonymous traffic.
- ClamAV is optional but recommended in production for user-supplied binaries; `CLAMAV_REQUIRED=true` fails closed when misconfigured.
- Sharp re-encoding reduces malformed/polyglot image risk; it is not a substitute for full malware analysis on non-image uploads.
