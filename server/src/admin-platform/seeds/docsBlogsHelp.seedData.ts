import type { DocsHelpSeedItem } from './documentationHelpSeed.types.js';

/** Blog & engagement documentation for `/docs` — seeded via `npm run seed:docs:blogs`. */
export const DOCS_BLOGS_HELP_SEED: DocsHelpSeedItem[] = [
  {
    slug: 'blogs-overview',
    title: 'Blogs Overview',
    icon: 'book-open',
    sortOrder: 300,
    tags: ['blogs'],
    summary:
      'Section guide for writing, publishing, reading, and engaging with posts on Syntax Stories.',
    body: `# Blogs Overview

Syntax Stories posts are long-form **blogs**: block-based editor content published to a stable public URL.

## URLs at a glance

| Surface | URL |
|---------|-----|
| Write workspace | \`/blogs/write\` |
| Public post | \`/blogs/{username}/{slug}\` |
| Your posts list | \`/u/{username}/blogs\` |
| Saved posts | \`/bookmarks\` |
| Your reposts | \`/reposts\` |
| Home feed | \`/\` |

## Lifecycle

1. **Create** — compose in the write workspace, save drafts, deploy to publish.
2. **Read** — open the canonical post URL; qualified reads increment **Views**.
3. **Engage** — **Respect**, **Repost**, **Bookmark**, and **Comment**.
4. **Manage** — edit, move to trash (7 days), restore, or delete forever from your profile blogs tab.

## Articles in this section

| Topic | Doc |
|-------|-----|
| Write & publish | [Writing and publishing](/docs/writing-and-publishing) |
| Edit drafts & live posts | [Editing posts](/docs/editing-posts) |
| Read & discover | [Viewing posts](/docs/viewing-posts) |
| View counts & streaks | [Views and read streak](/docs/post-views-and-read-streak) |
| Respect (like) | [Respect](/docs/respect-engagement) |
| Repost | [Reposts](/docs/reposts) |
| Bookmarks | [Bookmarks](/docs/bookmarks) |
| Comments | [Comments](/docs/comments-on-posts) |
| Trash & restore | [Managing your posts](/docs/managing-your-posts) |

Short FAQ answers also live at **/help** (category \`general\`).
`,
  },
  {
    slug: 'writing-and-publishing',
    title: 'Writing and Publishing',
    icon: 'book-open',
    sortOrder: 310,
    tags: ['blogs', 'write'],
    summary:
      'Create posts at /blogs/write, save drafts, use Deploy_Post, and publish to /blogs/username/slug.',
    body: `# Writing and Publishing

## Open the editor

- Navbar **Write** or sidebar **WRITE** → **/blogs/write**
- Legacy simple editor: **/write** (single-shot create; prefer \`/blogs/write\` for the full workspace)

You must be signed in. The workspace uses a block-based **BlogWriteEditor** with title, summary, thumbnail, and content blocks (markdown-friendly).

## Save a draft

- Autosave syncs locally and to the API.
- **Draft** endpoints: \`PUT /api/blog/draft\` (new) or \`PUT /api/blog/post/:postId\` with \`status: "draft"\`.
- UI feedback: **DRAFT_SYNCED**.

## Publish (Deploy_Post)

1. Finish title and body (both required to publish).
2. Click **Deploy_Post** (shows **Deploying...** while saving).
3. **Deploy overlay** — pick **category**, **tags**, **language**, optional **squad**.
4. API: \`POST /api/blog\` (new) or \`PUT /api/blog/post/:postId\` with \`status: "published"\`.
5. Success toast: **POST_LIVE**; editor session clears for a fresh post.

## Public URL

Published posts are served at:

\`\`\`
/blogs/{your-username}/{post-slug}
\`\`\`

Slugs are unique per author. Changing a slug after publish updates the canonical link (old slugs may redirect via history).

## Taxonomy

Categories and tags help discovery on **/categories**, **/topics**, and feeds. Set them in the deploy overlay before going live.

## Next steps

- [Editing posts](/docs/editing-posts) — update content after publish.
- [Managing your posts](/docs/managing-your-posts) — drafts list and trash.
`,
  },
  {
    slug: 'editing-posts',
    title: 'Editing Posts',
    icon: 'settings',
    sortOrder: 320,
    tags: ['blogs', 'write'],
    summary:
      'Edit from /u/username/blogs, session-based /blogs/write target, and draft fork when changing published posts.',
    body: `# Editing Posts

## Where to start

Open **/u/{your-username}/blogs** → **Published** tab → **Edit** on a card.

That stores the post id in **sessionStorage** (\`syntax-stories-blog-write-target-post\`) and navigates to **/blogs/write**. The post id is **not** kept in the URL (legacy \`?postId=\` is migrated into session storage and stripped).

## Load & save

- Load: \`GET /api/blog/post/:postId\`
- Save draft: \`PUT /api/blog/post/:postId\` with \`status: "draft"\`
- Publish changes: deploy flow → \`status: "published"\`

## Editing a live post safely

When you save draft changes on an already **published** post, the API may **fork** a new draft (\`forkedFromPublished: true\`) so the live URL stays unchanged until you deploy again. The UI warns you when a fork occurs.

## New post vs edit

- **Write** from the navbar clears the session post id → blank workspace.
- Leaving **/blogs/write** after publish clears the target id so you do not accidentally overwrite the previous post.

## Related

- [Writing and publishing](/docs/writing-and-publishing)
- [Managing your posts](/docs/managing-your-posts)
`,
  },
  {
    slug: 'viewing-posts',
    title: 'Viewing Posts',
    icon: 'globe',
    sortOrder: 330,
    tags: ['blogs', 'read'],
    summary:
      'Open /blogs/username/slug, home and following feeds, trending, topics, and live stats on the post page.',
    body: `# Viewing Posts

## Post detail page

Canonical reader URL:

\`\`\`
/blogs/{username}/{slug}
\`\`\`

Data loads via \`GET /api/blog/p/{username}/{slug}\`. Signed-in readers may see extra flags (e.g. whether they already respected or bookmarked).

## Discovery feeds

| Feed | URL | API (typical) |
|------|-----|----------------|
| Home | \`/\` | \`GET /api/blog/feed\` |
| Following | \`/following\` | posts from followed authors |
| Trending | \`/trending\` | engagement-weighted |
| Topics | \`/topics/{slug}\` | tag-filtered feed |
| Categories | \`/categories\` | \`GET /api/blog/taxonomy\` |

Feed cards show title, excerpt, author, and quick actions (Respect, Repost, Bookmark, share).

## Post page layout

- Main column: rendered blocks (markdown, embeds, code, etc.).
- Sidebar / dock: **Views**, **Respect**, **Repost**, **Saved**, **Comments** — updated in real time.
- Comments section and bottom dock for engagement shortcuts.

## Live stats (SSE)

While the tab is open, the client may subscribe to:

\`\`\`
GET /api/blog/p/{username}/{slug}/stats/stream
\`\`\`

Counts refresh without reloading the page when other readers engage.

## View counts

**Views** are not raw page loads. See [Views and read streak](/docs/post-views-and-read-streak) for the qualified read rules.
`,
  },
  {
    slug: 'post-views-and-read-streak',
    title: 'Views and Read Streak',
    icon: 'zap',
    sortOrder: 340,
    tags: ['blogs', 'read'],
    summary:
      'Qualified view counting (10s dwell, signed in), read/start and read/commit, and blog streak settings.',
    body: `# Views and Read Streak

## Qualified views

\`viewCount\` on a post increases only for **qualified reads**, not every page impression.

| Rule | Detail |
|------|--------|
| Auth | Guest readers do not commit views |
| Self-read | Authors reading their own post are excluded |
| Dwell | Default **10 seconds** on page (\`minDwellMs\`) |
| Status | Post must be **published** and not in trash |

## Client flow (signed in, not author)

1. \`POST /api/blog/p/{username}/{slug}/read/start\` → \`sessionId\` + \`minDwellMs\`
2. Wait at least \`minDwellMs\`
3. \`POST /api/blog/p/{username}/{slug}/read/commit\` with \`{ sessionId }\` → increments \`viewCount\`

If Redis is unavailable, the app may fall back to \`read-day\` for **streak only** (no view increment).

## Read streak

Reading published posts on separate UTC days builds a **read streak**. Configure display mode under **Settings → Blog Streak** (daily / weekly / monthly presentation).

Streak days can be recorded via commit success or the \`read-day\` fallback endpoint.

## What you see in the UI

Post sidebar label **Views** reflects the denormalized counter on the post document, updated after successful commits and via the stats stream.
`,
  },
  {
    slug: 'respect-engagement',
    title: 'Respect',
    icon: 'zap',
    sortOrder: 350,
    tags: ['blogs', 'engagement'],
    summary:
      'Respect is the platform like: toggle on feed cards and post page, API, counts, and self-post rules.',
    body: `# Respect

On Syntax Stories, **Respect** is the primary positive reaction on blog posts (not “Like” in the post UI).

## Where to Respect

- **Feed cards** — spark / Respect control on the engagement rail.
- **Post page** — Respect in the comments dock and sidebar stats.

Toggle on → \`respecting: true\`; toggle off → \`respecting: false\`.

## API

\`\`\`
POST /api/blog/p/{username}/{slug}/respect
{ "respecting": true | false }
\`\`\`

Requires sign-in. Rate limited (\`rl:blog:respect:write\`).

Batch state for lists:

\`\`\`
POST /api/blog/respect/viewer-state
{ "postIds": ["...", "..."] }
\`\`\`

## Counts

- \`respectCount\` on the post document
- Live updates via stats **SSE** on the post page
- Achievements may unlock from Respect milestones

## Rules

- You **cannot Respect your own post** (toast explains).
- Respect is independent of Repost and Bookmark.

## Data model

Edges stored in \`blogrespects\`; denormalized count on \`blogposts\` for fast feeds.
`,
  },
  {
    slug: 'reposts',
    title: 'Reposts',
    icon: 'zap',
    sortOrder: 360,
    tags: ['blogs', 'engagement'],
    summary:
      'Repost posts to your audience, toggle from feed or post page, and browse /reposts library.',
    body: `# Reposts

A **Repost** shares someone else’s published post to your followers’ surfaces (distinct from writing an original article).

## Toggle a repost

From a feed card or post detail dock:

\`\`\`
POST /api/blog/p/{username}/{slug}/repost
{ "reposting": true | false }
\`\`\`

Requires sign-in. Shares rate limits with bookmark writes (\`rl:blog:engagement:write\`).

## Rules

- Cannot **Repost your own post**.
- Target must be a **published**, non-deleted post.

## Your repost library

**Navigation → Reposts** or **/reposts** lists posts you have reposted:

\`\`\`
GET /api/reposts/posts
\`\`\`

Use this page to review what you have amplified or to undo reposts from the original post UI.

## Counts

\`repostCount\` on the post; visible in sidebar stats and updated over SSE when subscribed.
`,
  },
  {
    slug: 'bookmarks',
    title: 'Bookmarks',
    icon: 'smile',
    sortOrder: 370,
    tags: ['blogs', 'engagement'],
    summary:
      'Save posts while reading, optional bookmark groups, /bookmarks library, and bookmark API.',
    body: `# Bookmarks

**Bookmarks** (UI label **Saved**) are private saves for reading later.

## Save from a post

On feed cards or the post dock:

\`\`\`
POST /api/blog/p/{username}/{slug}/bookmark
{ "bookmarked": true | false, "groupId": "optional-group-id" }
\`\`\`

Requires sign-in.

## Bookmark library

**/bookmarks** — all saved posts via:

\`\`\`
GET /api/bookmarks/posts
\`\`\`

## Bookmark groups

Organize saves into folders:

- \`GET/POST/PATCH/DELETE /api/bookmarks/groups\`
- Assign a \`groupId\` when bookmarking to file a post into a group.

Groups are useful for tutorials, references, and separate reading lists.

## Counts

Public **Saved** count on the post (\`bookmarkCount\`) reflects how many users bookmarked (not which users). Your saves are only visible to you in **/bookmarks**.

## Related engagement

Bookmarks are independent of **Respect** and **Repost**. See [Blogs overview](/docs/blogs-overview).
`,
  },
  {
    slug: 'comments-on-posts',
    title: 'Comments on Posts',
    icon: 'message-circle',
    sortOrder: 380,
    tags: ['blogs', 'engagement'],
    summary:
      'Threaded comments on posts: list, add, edit, delete, and comment likes on the post page.',
    body: `# Comments on Posts

Comments live on the post detail page (**/blogs/{username}/{slug}**) in **BlogCommentsSection** and the comments dock.

## List (public)

\`\`\`
GET /api/blog/p/{username}/{slug}/comments?limit=
\`\`\`

Works for guests; optional auth adds viewer-specific flags.

## Add (signed in)

\`\`\`
POST /api/blog/p/{username}/{slug}/comments
\`\`\`

Body includes comment text (and threading fields when replying).

## Edit & delete (author only)

| Action | Method |
|--------|--------|
| Edit | \`PATCH .../comments/:commentId\` |
| Delete | \`DELETE .../comments/:commentId\` |

Only the comment author may change or remove their comment.

## Comment likes

Comments use **Like** (not Respect):

\`\`\`
POST /api/blog/p/{username}/{slug}/comments/:commentId/like
\`\`\`

Toggles \`likedByViewer\` and \`likeCount\` on that comment.

## Counts

\`commentCount\` on the post updates when comments are added or removed; sidebar **Comments** stat includes live SSE updates.
`,
  },
  {
    slug: 'managing-your-posts',
    title: 'Managing Your Posts',
    icon: 'layers',
    sortOrder: 390,
    tags: ['blogs', 'manage'],
    summary:
      'Profile blogs tabs (published, drafts, trash), soft delete, 7-day restore, and permanent delete.',
    body: `# Managing Your Posts

## Profile blogs hub

**/u/{username}/blogs**

| Tab | Who sees it | Contents |
|-----|-------------|----------|
| Published | Everyone | Live posts at \`/blogs/{username}/{slug}\` |
| Drafts | Owner only | Unpublished workspace saves |
| Trash | Owner only | Soft-deleted posts (7-day window) |

## List API (owner)

\`\`\`
GET /api/blog?status=draft|published|deleted
\`\`\`

Cards expose **View**, **Edit**, **Delete**, **Restore**, **Delete forever** depending on status.

## Soft delete (trash)

From Published → **Delete**:

\`\`\`
DELETE /api/blog/post/:postId
\`\`\`

Sets \`deletedAt\`; toast **Post moved to trash**. Post disappears from public URLs and feeds.

**Retention: 7 days** — after that, trash cleanup may purge expired rows.

## Restore

Trash tab → **Restore**:

\`\`\`
PUT /api/blog/post/:postId/restore
\`\`\`

Republishes the post. Slug may change if another post took the same slug while deleted.

## Permanent delete

Trash tab → **Delete forever**:

\`\`\`
DELETE /api/blog/post/:postId/permanent
\`\`\`

Irreversible removal.

## Owner actions on feed cards

When you see your own post in a feed, the owner overlay offers the same manage actions without visiting the profile tab first.

## Related docs

- [Editing posts](/docs/editing-posts)
- [Writing and publishing](/docs/writing-and-publishing)
`,
  },
];
