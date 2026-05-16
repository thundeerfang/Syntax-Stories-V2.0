# Blog engagement, stats, Redis, queues, and real-time delivery

This document describes the **MongoDB** models and counters, **REST** endpoints, **Redis** Pub/Sub and outbox list, **SSE** stream for web clients, and how **mobile / Action Cable–style** apps can subscribe to the same events. It complements `docs/BLOG_RESPECT.md` and `docs/BLOG_READ_STREAK.md`.

## Data model (MongoDB)

### `blogposts` (BlogPost)

Denormalized counters (kept in sync with edge collections and comment lifecycle):

| Field | Meaning |
| --- | --- |
| `respectCount` | Distinct users respecting the post (existing; see BLOG_RESPECT). |
| `repostCount` | Distinct users who hit Repost (`blogreposts`). |
| `bookmarkCount` | Distinct users who saved the post (`blogbookmarks`). |
| `commentCount` | All comments on the post (top-level + replies). |
| `viewCount` | Incremented on **successful** authenticated `read/commit` (qualified read), not raw page loads. |

### Edge collections (per user, not embedded on `users`)

- **`blogrespects`**: `(userId, postId)` unique — Respect is the post “like”.
- **`blogreposts`**: `(userId, postId)` unique — Repost toggle.
- **`blogbookmarks`**: `(userId, postId)` unique — Saved / bookmark.

Storing edges in dedicated collections avoids unbounded arrays on the user document and keeps indexes predictable.

### `blogcomments`

- **Reply**: `parentId` references another comment on the same post (already supported).
- **Timestamps**: `createdAt`, `updatedAt` (Mongoose).
- **Edited**: `editedAt` set when the author PATCHes the body; API exposes `editedAt` and ISO `updatedAt`.
- **Like**: `likedBy[]` + `POST .../comments/:id/like` (existing).
- **Delete**: author-only; cascades direct replies (existing).

### Eligibility / suspend / restore

When a post stops being publicly eligible (draft, soft-delete), **Respect** handling follows existing rules. **Repost** and **bookmark** counts are **zeroed** on the post while edges remain; on restore, counts are **recomputed** from `blogreposts` / `blogbookmarks`. Permanent purge deletes all respect, repost, and bookmark edges for that post.

## REST API

### Public post payload

`GET /api/blog/p/:username/:slug` includes:

- `respectCount`, `repostCount`, `bookmarkCount`, `commentCount`, `viewCount`
- If authenticated (optional JWT): `viewerHasRespected`, `viewerHasReposted`, `viewerHasBookmarked`

Feed and author post lists include the numeric counters; with auth they also include the three `viewerHas*` flags.

### Mutations (JWT required)

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/api/blog/p/:username/:slug/respect` | `{ "respecting": boolean }` |
| `POST` | `/api/blog/p/:username/:slug/repost` | `{ "reposting": boolean }` |
| `POST` | `/api/blog/p/:username/:slug/bookmark` | `{ "bookmarked": boolean }` |

Rate limits: Respect uses `rl:blog:respect:write:`; repost/bookmark use `rl:blog:engagement:write:` (same window/limit class as Respect writes).

### Batch viewer state

`POST /api/blog/engagement/viewer-state` with `{ "postIds": string[] }` (max 50) returns:

```json
{
  "success": true,
  "viewerRespectStates": { "<postId>": true },
  "viewerRepostStates": { "<postId>": false },
  "viewerBookmarkStates": { "<postId>": true }
}
```

Use this for feed grids instead of N per-post calls. The legacy `POST /api/blog/respect/viewer-state` remains for backward compatibility.

### Comments (existing)

- `GET/POST /api/blog/p/:username/:slug/comments`
- `PATCH/DELETE .../comments/:commentId`
- `POST .../comments/:commentId/like`

Creating or deleting comments updates `commentCount` and emits a stats event (below).

### Views

`viewCount` increments when `POST .../read/commit` succeeds with a **new** counted session (not `alreadyProcessed`). This ties views to the same qualified-read pipeline as reading streaks.

## Redis: Pub/Sub + outbox “queue”

Keys are defined in `server/src/shared/redis/keys.ts`:

- **Channel**: `blog:stats:<postId>` — `PUBLISH` JSON payloads when stats change.
- **Outbox list**: `blog:stats:outbox` — each publish also **`LPUSH`**es the same JSON for workers (webhooks, mobile push, analytics).

Payload shape (`server/src/services/blogStatsPublish.service.ts`):

```json
{
  "v": 1,
  "type": "blog_post_stats",
  "postId": "...",
  "username": "author",
  "slug": "post-slug",
  "stats": {
    "respectCount": 0,
    "repostCount": 0,
    "bookmarkCount": 0,
    "commentCount": 0,
    "viewCount": 0
  },
  "ts": 1710000000000
}
```

**Emit triggers** (non-exhaustive): respect, repost, bookmark, comment create/delete, successful read commit (view increment).

### Worker pattern (recommended)

1. **`BRPOP blog:stats:outbox 5`** (or dedicated consumer group if you move to Redis Streams).
2. Validate / dedupe (e.g. by `postId` + `ts` window).
3. Deliver HTTPS webhooks, FCM/APNs, or enqueue to BullMQ / SQS.

The in-process pattern used elsewhere in the repo (e.g. legal jobs) can be upgraded to **BullMQ** when you need retries, DLQ, and horizontal workers; the outbox list is a deliberately simple stepping stone.

## SSE (“webhook-like” pull stream)

For browsers and server-sent events clients:

`GET /api/blog/p/:username/:slug/stats/stream`

- `Content-Type: text/event-stream`
- First message: `{ "type": "snapshot", "postId", "stats": { ... } }`
- Later: `{ "type": "update", "postId", "stats": { ... } }` from Redis subscribe
- Comment heartbeats: `: ping` lines every 25s

**Redis is required** for live updates on this route. If `REDIS_URL` is unset, the handler still sends the snapshot and pings, but will not receive Pub/Sub updates.

## Mobile apps and “Action Cable”

Rails **Action Cable** is WebSocket-based. This stack uses **HTTP + SSE + Redis Pub/Sub** instead. Equivalent options:

1. **SSE** from the app (if the HTTP client supports streaming).
2. **Native WebSocket gateway** (Node, Go, Elixir) that **subscribes** to `blog:stats:<postId>` and forwards to device sockets.
3. **FCM / APNs** driven by the **outbox worker** for push notifications on large count changes.

For Flutter/React Native, prefer a small **engagement service** that: loads initial counts from `GET /post`, then opens SSE or WebSocket to the same channel semantics.

## Backfill

After deploying schema changes, run once against production (maintenance window optional):

```bash
cd server && npx tsx src/scripts/backfillBlogPostEngagementCounts.ts
```

This sets `commentCount`, `repostCount`, and `bookmarkCount` from source collections. `viewCount` is left unchanged (only future read commits add to it).

## Security notes

- Repost and bookmark mutations require authentication; public reads stay optional-auth for viewer flags.
- SSE is public for **counts** on published posts (no secret counts). Do not put PII in the payload.
- For **server-to-server webhooks**, add HMAC signing of outbox payloads and rotate secrets; implement in the worker, not in this MVP list push.

## Related files

| Area | Path |
| --- | --- |
| Models | `server/src/models/BlogPost.ts`, `BlogRepost.ts`, `BlogBookmark.ts`, `BlogComment.ts` |
| Engagement | `server/src/services/blogEngagement.service.ts` |
| Publish | `server/src/services/blogStatsPublish.service.ts` |
| SSE | `server/src/controllers/blogStatsStream.controller.ts` |
| Routes | `server/src/routes/blog.routes.ts` |
| Redis keys | `server/src/shared/redis/keys.ts` |
