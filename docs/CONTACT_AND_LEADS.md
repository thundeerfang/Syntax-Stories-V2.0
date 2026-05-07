# Contact page and contact leads

This document describes the public **Contact** experience, the **Contact leads** pipeline, and how operators review submissions in the **admin** app.

## Product goals

- **Webapp** (`/contact`): A two-column layout aligned with the neo-brutalist “terminal” styling used on pages like **Invite / referral** — form on the left, company and “about us” on the right (sticky on large screens).
- **Footer**: The existing **Contact** link targets `/contact` (same as other footer labels → lowercase path).
- **Admin**: Staff with the right permission can list and open individual **contact leads** (similar workflow to **Feedback**).

## Public API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/contact` | Submit a contact lead (JSON body). |

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `fullName` | Yes | Max 120 characters, trimmed. |
| `email` | Yes | Valid email shape, max 254, stored lowercased. |
| `company` | No | Max 120. |
| `topic` | Yes | Short subject line, max 200. |
| `message` | Yes | Max 5000. |
| `altcha` | When anonymous | Same ALTCHA contract as auth/feedback when the server has a verification key configured. |
| `_hp` | No | Honeypot: must be empty. If populated, the server returns success without persisting (soft bot rejection). |

Optional header: `X-Device-Fingerprint` — used with IP for Redis-backed rate limiting (same idea as feedback).

Optional header: `Authorization: Bearer …` — when valid, the submission is associated with the signed-in user (`userId` / `username` on the stored document).

### Spam and abuse controls

1. **Rate limit**: Per IP (+ optional device fingerprint), **15 submissions per rolling hour** (see `rateLimitContact` in `server/src/middlewares/auth/rateLimitAuth.ts`).
2. **ALTCHA**: When not authenticated, the same `verifyAltchaIfConfigured` path as feedback applies — the webapp includes `AltchaField` when a challenge URL is available.
3. **Honeypot**: Hidden field `_hp` in the form; bots that fill it get a generic success response with no DB write.

### Success response

```json
{ "success": true, "id": "<Mongo ObjectId string>" }
```

Errors use `{ "success": false, "message": "…" }` with appropriate HTTP status codes.

## Admin management API

Base path: `/api/v1/admin/management` (same router as users, feedback, roles).

| Method | Path | Permission |
|--------|------|----------------|
| `GET` | `/contact-leads?limit=&cursor=` | `contact_lead:read` |
| `GET` | `/contact-leads/:id` | `contact_lead:read` |

Pagination matches **feedback submissions**: `limit` (default 25, max 100), `cursor` = Mongo ObjectId of the last item from the previous page (descending by `_id`).

### RBAC

- Permission key: **`contact_lead:read`** (declared in `server/src/modules/admin/adminPermissions.ts`).
- The access catalog seed (`ensureAdminAccessCatalogSeed`) upserts this key into the permission catalog so it can be assigned to roles in **Admin → Access**.
- When `FEATURE_ADMIN_RBAC_ENABLED` is false, all catalog permissions are effectively granted to staff (existing behavior).

Assign **`contact_lead:read`** to any role that should open **Contact leads** in the admin nav.

## Data model

Collection: **`contactleads`** (Mongoose model `ContactLead`).

Stored fields include: `fullName`, `email`, `company`, `topic`, `message`, optional `userId` / `username`, `clientMeta`, `serverMeta` (IST timestamp, IP, forwarded-for, user-agent), timestamps.

## Webapp implementation notes

- Page route: `webapp/src/app/contact/page.tsx`.
- Client API helper: `webapp/src/api/contact.ts` — posts to `${NEXT_PUBLIC_API_BASE_URL}/api/contact` (or same-origin in dev when unset).
- Business copy (address, hours, short “about us”) lives in the page for now; override or extend with your own content or future `NEXT_PUBLIC_*` variables as needed.

## Admin app implementation notes

- Nav: **Contact leads** → `/contact-leads` and `/contact-leads/[id]`.
- API client: `listContactLeads` / `getContactLead` in `admin/src/lib/api.ts`.

## Operational checklist

1. Ensure MongoDB migrations / deploy include the new model (no separate migration file required — Mongoose creates the collection on first write).
2. After deploy, assign **`contact_lead:read`** to the appropriate admin roles if RBAC is enabled.
3. Configure ALTCHA on the API if you want anonymous contact to require a challenge in production.
