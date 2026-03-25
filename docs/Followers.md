
Here’s how follower/following works and which files are involved.

---

# Follower / following logic

## Data model (server)

**File:** `server/src/models/Follow.ts`

- **Collection:** `follows`
- **Fields:** `follower` (ObjectId, ref `users`), `following` (ObjectId, ref `users`), `createdAt` (from timestamps)
- **Unique index:** `(follower, following)` so a user can follow another only once

Meaning: one document = “follower follows following”.  
**Followers of X** = docs where `following === X._id`.  
**Users X follows** = docs where `follower === X._id`.

---

## Server API

**Routes:** `server/src/routes/follow.routes.ts`  
Mounted at `/api/follow` in `server/src/routes/index.ts`.

| Method | Route | Auth | Handler | Purpose |
|--------|--------|------|--------|--------|
| GET | `/profile/:username` | No | `getPublicProfile` | Public profile + `followersCount`, `followingCount` |
| GET | `/counts/:username` | No | `getFollowCounts` | Only `followersCount`, `followingCount` |
| GET | `/followers/:username` | No | `getFollowers` | List of users who follow this profile (up to 500) |
| GET | `/following/:username` | No | `getFollowing` | List of users this profile follows (up to 500) |
| GET | `/check/:username` | Yes (verifyToken) | `checkFollowing` | For current user: `{ following: boolean }` |
| POST | `/:username` | Yes | `followUser` | Current user follows `:username` |
| DELETE | `/:username` | Yes | `unfollowUser` | Current user unfollows `:username` |

**Controller:** `server/src/controllers/follow.controller.ts`

- **getPublicProfile:** Load user by username, count `following: user._id` → followers, `follower: user._id` → following; return profile + counts.
- **getFollowCounts:** Same counts only.
- **getFollowers:** `FollowModel.find({ following: user._id })`, populate `follower`, return list (id, username, fullName, profileImg).
- **getFollowing:** `FollowModel.find({ follower: user._id })`, populate `following`, return list.
- **followUser:** Resolve target by username; reject if self; if no existing follow doc, `FollowModel.create({ follower: currentUser._id, following: target._id })`.
- **unfollowUser:** `FollowModel.deleteOne({ follower: currentUser._id, following: target._id })`.
- **checkFollowing:** `FollowModel.exists({ follower: currentUser._id, following: target._id })` → `{ following: true/false }`. If no auth, returns `following: false`.

---

## Webapp API client

**File:** `webapp/src/api/follow.ts`

- **getPublicProfile(username)** → GET `/api/follow/profile/:username` → `{ user, followersCount, followingCount }`
- **getFollowCounts(username)** → GET `/api/follow/counts/:username` → `{ followersCount, followingCount }`
- **getFollowers(username)** → GET `/api/follow/followers/:username` → `{ list: FollowUser[] }`
- **getFollowing(username)** → GET `/api/follow/following/:username` → `{ list: FollowUser[] }`
- **follow(username, accessToken)** → POST `/api/follow/:username` with `Authorization: Bearer <token>`
- **unfollow(username, accessToken)** → DELETE `/api/follow/:username` with `Authorization: Bearer <token>`
- **checkFollowing(username, accessToken)** → GET `/api/follow/check/:username` with Bearer token → `{ following: boolean }`

Types: `FollowUser`, `FollowCounts`, `PublicProfileUser` are defined here.

---

## Webapp UI usage

### 1. Public profile page (`/u/[username]`)

**File:** `webapp/src/app/u/[username]/page.tsx`

- **Data:** `followApi.getPublicProfile(username)` for profile + initial `followersCount` / `followingCount`; `followApi.checkFollowing(username, token)` to set `following` (am I following this user?).
- **Follow button:** If not self and logged in: button runs `handleFollowClick` → `followApi.follow` or `followApi.unfollow`, then updates local `following` and `followersCount`. If not logged in: “Follow” links to login.
- **Counts:** Shown in stats and in the “Followers & Following” block; clicking that opens the dialog.
- **Dialog:** `FollowersFollowingDialog` with `username`, `token`, `followersCount`, `followingCount`, `onFollowChange={refreshCounts}` so counts refresh after follow/unfollow in the dialog.

### 2. Own profile page (`/profile`)

**File:** `webapp/src/app/profile/page.tsx`

- **Counts:** `followApi.getFollowCounts(user.username)` to show followers/following.
- **Dialog:** Same `FollowersFollowingDialog`; `onFollowChange` refetches `getFollowCounts` so the profile card counts stay in sync.

### 3. Followers / following dialog

**File:** `webapp/src/components/profile/dialog/FollowersFollowingDialog.tsx`

- **Props:** `open`, `onClose`, `username`, `token`, `followersCount`, `followingCount`, `onFollowChange`.
- **When opened:** Fetches `followApi.getFollowers(username)` and `followApi.getFollowing(username)` and shows them in “Followers” / “Following” tabs with search.
- **Actions:** Follow/Unfollow buttons call `followApi.follow` / `followApi.unfollow`; then `onFollowChange()` so parent can refresh counts; dialog updates its “following” list after follow.

---

## Flow summary

1. **Viewing a profile:**  
   Public profile + counts come from `getPublicProfile` (or profile page uses `getFollowCounts`).  
   “Am I following?” comes from `checkFollowing` when logged in.

2. **Follow/Unfollow:**  
   POST or DELETE to `/api/follow/:username` with auth.  
   Server creates or deletes a `Follow` document and returns success.  
   Client updates local state and optionally refetches counts.

3. **Opening “Followers & Following”:**  
   Dialog calls `getFollowers` and `getFollowing`, shows lists and allows follow/unfollow with token; parent refreshes counts via `onFollowChange`.

---

## File list

| Role | File |
|------|------|
| **Server – model** | `server/src/models/Follow.ts` |
| **Server – controller** | `server/src/controllers/follow.controller.ts` |
| **Server – routes** | `server/src/routes/follow.routes.ts` |
| **Server – mount** | `server/src/routes/index.ts` (mounts at `/follow` under API) |
| **Webapp – API** | `webapp/src/api/follow.ts` |
| **Webapp – dialog** | `webapp/src/components/profile/dialog/FollowersFollowingDialog.tsx` |
| **Webapp – public profile** | `webapp/src/app/u/[username]/page.tsx` |
| **Webapp – own profile** | `webapp/src/app/profile/page.tsx` |


2. The next message 


Here’s a concrete **step-by-step plan** you can follow, aligned with your current code and the architecture you described. (Ask mode = no code edits from me; you or Agent mode would implement.)

---

# Steps to Implement the Production Follow Architecture

## Phase 1: Indexes and atomic follow (quick wins)

### Step 1.1 – Add/verify indexes on `follows`

Your `Follow` model already has a **unique compound** on `(follower, following)`. Add/ensure:

- `{ follower: 1 }` – list who the current user follows.
- `{ following: 1 }` – list followers of a user.
- `{ follower: 1, following: 1 }, { unique: true }` – dedupe + fast follow check.

In Mongoose (`server/src/models/Follow.ts`), that’s the compound you have; add single-field indexes if not already there so “who does X follow?” and “who follows X?” are indexed.

### Step 1.2 – Atomic follow (optional but good)

Use `findOneAndUpdate` with `upsert: true` (or “find one, then create if not exists” in a transaction) so two concurrent follow requests don’t race. Today you do `findOne` then `create`; at scale you’d use a unique index + upsert or a short transaction so only one insert wins.

---

## Phase 2: Counts on the User document

### Step 2.1 – User schema

In `server/src/models/User.ts` add:

- `followersCount: { type: Number, default: 0 }`
- `followingCount: { type: Number, default: 0 }`

(Or whatever your schema style uses.)

### Step 2.2 – Backfill current counts (one-time)

Script or migration:

1. For each user `_id`, set:
   - `followersCount = countDocuments({ following: user._id })`
   - `followingCount = countDocuments({ follower: user._id })`
2. Update each user document with these values.

### Step 2.3 – Update on follow/unfollow

In `server/src/controllers/follow.controller.ts`:

- **followUser:** After creating the follow doc:
  - `UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } })`
  - `UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: 1 } })`
- **unfollowUser:** After deleting the follow doc:
  - `$inc: { followersCount: -1 }` on target
  - `$inc: { followingCount: -1 }` on current user

Guard with “only if the follow doc was actually created/deleted” so double-follow/unfollow or retries don’t corrupt counts.

### Step 2.4 – Read counts from User

- In **getPublicProfile** and **getFollowCounts**, stop using `FollowModel.countDocuments` for these two numbers; use `user.followersCount` and `user.followingCount` from the user document (with a small fallback to countDocuments during migration if needed).
- Ensure `followersCount`/`followingCount` are in the select/projection wherever you return profile or counts.

---

## Phase 3: Redis cache for counts

### Step 3.1 – Cache keys and TTL

- Keys: e.g. `followers:{userId}`, `following:{userId}`.
- Values: count (string or number).
- TTL: e.g. 5–15 minutes so cache isn’t stale forever.

### Step 3.2 – Read path

- In getPublicProfile / getFollowCounts (or in a small service they call):
  - Try Redis GET for `followers:{id}` and `following:{id}`.
  - On cache hit, return those counts (and skip User doc count fields if you want to serve purely from cache).
  - On cache miss, read from User document, then SET in Redis with TTL.

### Step 3.3 – Write path (follow/unfollow)

- After updating User document counts:
  - Redis INCR `followers:{targetId}` and INCR `following:{currentUserId}` on follow.
  - INCR by -1 (or DECR) on unfollow.
  - Optionally set TTL on first write so keys don’t live forever.

Use a small helper so all count updates (User + Redis) go through one place and stay consistent.

---

## Phase 4: Dual collections (follows + followers) – optional

### Step 4.1 – New `followers` collection

Schema: `{ userId, followerId, createdAt }`  
Meaning: “followerId follows userId”.  
Indexes: `{ userId: 1, createdAt: -1 }`, `{ userId: 1, followerId: 1 }, { unique: true }`.

### Step 4.2 – Writes in both collections

On follow: insert into both `follows` (follower, following) and `followers` (userId = following, followerId = follower).  
On unfollow: delete from both.  
Do this in the same controller (or a small service) after the existing follow/unfollow logic; keep updating User counts (and Redis) as in Phase 2 and 3.

### Step 4.3 – Query by use case

- “Who does this user follow?” → `follows.find({ follower: userId })`.
- “Who follows this user?” → `followers.find({ userId })`.
- Keep using the same API response shape so the webapp doesn’t need to change.

---

## Phase 5: Cursor pagination for followers/following lists

### Step 5.1 – API contract

- Add optional query: `cursor` (e.g. `createdAt` of the last item from previous page) and `limit` (e.g. 20).
- Response: `{ list, nextCursor }` where `nextCursor` is the last document’s `createdAt` (or id) for the next request.

### Step 5.2 – Mongo query

- For followers: `find({ following: user._id, createdAt: { $lt: cursor } }).sort({ createdAt: -1 }).limit(20)` (or use `_id` if cursor is id).
- For following: same idea with `follower: user._id`.
- If you add the `followers` collection, “followers” list reads from `followers.find({ userId }).sort({ createdAt: -1 })` with cursor.

### Step 5.3 – Remove or raise the 500 limit

- Replace the current “limit 500” with cursor-based pages (e.g. 20 per page) so you never return huge lists.

---

## Phase 6: Feed storage and fanout (when you add posts)

### Step 6.1 – Collections

- **posts:** `{ _id, authorId, content, createdAt }` (plus whatever you need).
- **feeds:** `{ userId, postId, createdAt }` with index `{ userId: 1, createdAt: -1 }`.

### Step 6.2 – Fanout on write (normal users)

When a user creates a post:

1. Insert into `posts`.
2. Fetch followers (from `follows` or `followers` collection).
3. Insert one `feeds` doc per follower: `{ userId: followerId, postId, createdAt }`.
4. Do this in a **background job** (queue), not in the HTTP request.

### Step 6.3 – Queue (e.g. BullMQ)

- On post create: push a job “fanout post X to author’s followers”.
- Worker: loads followers, does `feeds.insertMany` in batches.
- Use a single Redis (or your queue backend) for the queue.

### Step 6.4 – Hybrid for “celebrities”

- Define a threshold (e.g. followersCount > 100k).
- Below: fanout on write (as above).
- Above: don’t write to `feeds` for that author; at read time, merge “precomputed feed” (from `feeds`) with “recent posts from celebrities I follow” (query posts by authorId in list of followed celebrities).

### Step 6.5 – Feed cache in Redis

- Key: `feed:{userId}` as a sorted set; member = postId, score = timestamp.
- On fanout: ZADD to each follower’s `feed:{userId}`.
- On feed read: ZREVRANGE to get latest N; on cache miss, build from Mongo and backfill Redis.

---

## Phase 7: Sharding (later, at very large scale)

- Shard the `follows` (and optionally `followers`) collection.
- Shard key: e.g. `{ follower: "hashed" }` so follow actions are spread across shards.
- Keep User document counts (and Redis) as the source of truth for counts; sharding is for the graph storage and list queries.

---

## Order of implementation (summary)

| Order | What | Where |
|-------|------|--------|
| 1 | Indexes on `follows` | `server/src/models/Follow.ts` |
| 2 | `followersCount` / `followingCount` on User | `server/src/models/User.ts` |
| 3 | Backfill counts (one-time script) | Script or migration |
| 4 | Increment/decrement on follow/unfollow | `server/src/controllers/follow.controller.ts` |
| 5 | Read counts from User in getPublicProfile / getFollowCounts | Same controller |
| 6 | Redis cache for counts (read + write) | New helper + controller |
| 7 | (Optional) `followers` collection + dual write | New model + controller |
| 8 | Cursor pagination for followers/following | Controller + webapp API/dialog |
| 9 | When you add posts: feeds collection, fanout worker, Redis feed cache | New models, queue, workers |

---

## “Instagram-style” billion-scale trick (conceptual)

The idea you mentioned (bucketed followers / 1B edges) usually looks like:

- **Bucketing:** Instead of one doc per follow, store many follower IDs in a single document, e.g. `{ userId, bucket: 0, followerIds: [id1, id2, ...] }` with a cap per doc (e.g. 1000). One user’s followers span many buckets. Shard by `userId` (or `userId + bucket`).
- **Routing:** To “list followers of X” you query by `userId` (and bucket) and aggregate; to “does A follow B?” you might maintain a separate index or structure keyed by (follower, following) for fast lookup.
- **Counts:** Still stored on the User (and in Redis); the bucket structure is for storing the graph and paginating over it without loading millions of single-edge docs.

If you want, the next step can be a **concrete Mongoose schema and API changes** for Phase 1–2 only (indexes + User counts + controller updates) so you can paste them into your repo. I’m in Ask mode so I can’t edit files; switch to Agent mode if you want those changes applied for you.

3. last step


I’m in **Ask mode**, so I can’t edit your repo. To have the changes applied automatically, switch to **Agent mode** and ask again (e.g. “implement the follow system steps”).

Below is the exact implementation you can paste or have an agent apply.

---

## 1. Follow model – indexes (Phase 1)

**File:** `server/src/models/Follow.ts`

- You already have `index: true` on `follower` and `following`, and a unique compound index. Optionally add explicit indexes so the intent is clear:

```ts
FollowSchema.index({ follower: 1 });
FollowSchema.index({ following: 1 });
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
```

---

## 2. Atomic follow (Phase 1)

**File:** `server/src/controllers/follow.controller.ts` – `followUser`

- Replace the “findOne then create” logic with a single **upsert** and use the result to decide whether to increment counts:

```ts
// Replace:
const existing = await FollowModel.findOne({ follower: currentUser._id, following: target._id });
if (existing) {
  res.status(200).json({ success: true, message: 'Already following' });
  return;
}
await FollowModel.create({ follower: currentUser._id, following: target._id });
res.status(201).json({ success: true, message: 'Following' });

// With:
const updateResult = await FollowModel.updateOne(
  { follower: currentUser._id, following: target._id },
  { $setOnInsert: { follower: currentUser._id, following: target._id } },
  { upsert: true }
);
const created = updateResult.upsertedCount === 1;
if (!created) {
  res.status(200).json({ success: true, message: 'Already following' });
  return;
}
await Promise.all([
  UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } }),
  UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: 1 } }),
]);
res.status(201).json({ success: true, message: 'Following' });
```

---

## 3. User model – counts (Phase 2)

**File:** `server/src/models/User.ts`

- **IUser:** add optional fields:

```ts
followersCount?: number;
followingCount?: number;
```

- **UserSchema:** add (e.g. after `twoFactorSecret`):

```ts
followersCount: { type: Number, default: 0 },
followingCount: { type: Number, default: 0 },
```

---

## 4. Unfollow – decrement counts (Phase 2)

**File:** `server/src/controllers/follow.controller.ts` – `unfollowUser`

- After `deleteOne`, only decrement if a document was actually deleted:

```ts
const deleteResult = await FollowModel.deleteOne({ follower: currentUser._id, following: target._id });
if (deleteResult.deletedCount > 0) {
  await Promise.all([
    UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } }),
    UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: -1 } }),
  ]);
}
res.status(200).json({ success: true, message: 'Unfollowed' });
```

---

## 5. getPublicProfile & getFollowCounts – read from User (Phase 2)

- **getPublicProfile:** In the `select`, add `followersCount followingCount`. When building the response, use `user.followersCount ?? 0` and `user.followingCount ?? 0`. If you want a lazy backfill for old users without counts, you can: if both are `undefined` or `null`, run the current `FollowModel.countDocuments` logic, then `UserModel.updateOne({ _id: user._id }, { $set: { followersCount, followingCount } })` and return those counts.
- **getFollowCounts:** Select `_id followersCount followingCount`. Return `user.followersCount ?? 0` and `user.followingCount ?? 0`, with the same optional lazy backfill via `countDocuments` + `updateOne` when counts are missing.

---

## 6. Cursor pagination (Phase 5)

- **getFollowers / getFollowing:** Accept query params `cursor` (e.g. ISO date or ObjectId string) and `limit` (default 20). Use something like:

  - `find({ following: user._id, createdAt: { $lt: cursor } }).sort({ createdAt: -1 }).limit(limit + 1)` (followers), then if you got `limit + 1` items, set `nextCursor = lastItem.createdAt` and return only `limit` items.
  - Same idea for following with `follower: user._id`.

- Response shape: `{ list, nextCursor }` (e.g. `nextCursor: string | null`).

- **Webapp:** In `webapp/src/api/follow.ts`, add optional `cursor` (and `limit`) to `getFollowers` and `getFollowing`, and parse `nextCursor` from the JSON. In `FollowersFollowingDialog`, first load with no cursor; then “Load more” calls the same API with `cursor: nextCursor` and appends to the list.

---

If you switch to **Agent mode** and say “implement the follow system steps,” I can apply these edits in your repo for you.