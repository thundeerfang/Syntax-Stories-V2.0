# Bookmarks — end-to-end flow

How saving posts, bookmark folders, and the `/bookmarks` library work across the webapp and API.

**Primary UI:** `webapp/src/app/bookmarks/page.tsx`  
**API client:** `webapp/src/api/bookmarks.ts`  
**Contracts:** `webapp/src/contracts/bookmarksApi.ts`  
**Server routes:** `server/src/routes/bookmark.routes.ts` (mounted at `/api/bookmarks`)  
**Server logic:** `server/src/services/bookmarkGroups.service.ts`, `server/src/services/blogEngagement.service.ts`

---

## Entry and auth

| Surface | Route / path |
|---------|----------------|
| Bookmark library | `/bookmarks` |
| Deep-link a folder | `/bookmarks?group={groupId}` |
| Sidebar shortcuts | `SidebarDrawer` → folder links with `?group=` |

- **Guard:** Signed-in users only on `/bookmarks` (`SignInRequiredPanel` when no session).
- **Token:** `useAuthStore().token` on all `/api/bookmarks/*` calls via `blogAuthFetch`.

---

## User journeys

### 1. Save or unsave a post (feed / post page)

1. User taps **Bookmark** on a feed card or post dock.
2. Webapp: `blogApi.setPostBookmark(username, slug, bookmarked, token)`  
   → `POST /api/blog/p/{username}/{slug}/bookmark` with `{ "bookmarked": true | false, "groupId"?: "..." }`.
3. Server (`blogEngagement.service.ts` → `setBookmarkDesiredState`):
   - If saving: creates `BlogBookmark` row or updates `groupId` when moving folders.
   - If unsaving: deletes row and decrements `bookmarkCount` on the post.
   - **Target folder:** `groupId` when provided and owned by viewer; otherwise the user’s **default** folder (`BookmarkGroup` with `isDefault: true`).
4. Response: `{ bookmarked, bookmarkCount }` — UI updates card/dock state.

New users get a **General** default folder automatically (`ensureDefaultBookmarkGroup`).

### 2. Open the library

1. Navigate to **/bookmarks** (navbar, sidebar **Bookmarks**, or profile links).
2. Parallel load:
   - `GET /api/bookmarks/groups` → folder list + per-folder counts.
   - `GET /api/bookmarks/posts?limit=80&sort=newest` → saved posts (all folders).
3. Toolbar: folder chips, search, sort (**Newest** / **Oldest** saved).

### 3. Filter by folder

1. Click a folder chip → `selectedFilter = groupId`.
2. Reload posts: `GET /api/bookmarks/posts?groupId={id}&sort=…&q=…`.
3. **All saved** clears `groupId` and shows every bookmark.

URL `?group=` syncs the active folder when groups have loaded.

### 4. Search saved titles

1. Type in **Search saved titles…** (320ms debounce).
2. `GET /api/bookmarks/posts?q={term}` — server filters loaded feed items by title (case-insensitive).

### 5. Create a folder

1. Click **Create folder**.
2. Dialog: name (required, max 80), **emoji picker** (curated list only — no free text), optional **Default folder** checkbox.
3. `POST /api/bookmarks/groups`  
   Body: `{ "name": "…", "emoji"?: "📚", "makeDefault"?: true }`.
4. Server validates emoji against `BOOKMARK_FOLDER_EMOJIS` (`server/src/lib/bookmarkFolderEmojis.ts`).
5. On success: folder list refreshes; toast **Folder created**.

### 6. Edit a folder

1. On a folder chip, open the **⋯** menu → **Edit folder**.
2. Same dialog as create (no default checkbox on edit).
3. `PATCH /api/bookmarks/groups/{groupId}`  
   Body: `{ "name"?: "…", "emoji"?: "📚" | "" }` — empty string clears emoji.
4. On success: list refreshes; toast **Folder updated**.

### 7. Set default folder (new saves)

1. Click the small square beside a folder name (purple when active = default).
2. Confirm dialog: **Make default**.
3. `PATCH /api/bookmarks/groups/{groupId}` with `{ "isDefault": true }`.
4. Server clears `isDefault` on other groups and sets it on the chosen one.
5. Future bookmark toggles without `groupId` land in this folder.

The default folder **cannot be deleted** (delete menu item disabled; API returns 400).

### 8. Delete a folder

1. **⋯** → **Delete folder** (disabled for default).
2. Confirm: posts in that folder move to the default folder.
3. `DELETE /api/bookmarks/groups/{groupId}`.
4. If the deleted folder was selected, filter resets to **All saved**.
5. Posts grid reloads.

---

## Allowed folder emojis

Picker and API only accept emojis from this list (keep webapp + server lists identical):

| | | | | |
|---|---|---|---|---|
| 📚 | 🔖 | 💡 | ⭐ | 🎯 |
| 🚀 | 💻 | 📝 | 🎨 | 🎮 |
| 🏠 | ❤️ | 🔥 | ✨ | 📌 |
| 🗂️ | 🌟 | 💼 | 🧠 | 🔬 |
| 📖 | | | | |

- **Webapp:** `BOOKMARK_FOLDER_EMOJIS` in `webapp/src/contracts/bookmarksApi.ts`  
- **Picker:** `webapp/src/components/bookmarks/BookmarkFolderEmojiPicker.tsx`  
- **Server:** `server/src/lib/bookmarkFolderEmojis.ts` → `sanitizeBookmarkFolderEmoji()`

Invalid emojis on create/update are rejected (`Emoji not allowed`) or stored as empty.

---

## REST API summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/bookmarks/groups` | Yes | List folders + `bookmarkCount` per folder |
| POST | `/api/bookmarks/groups` | Yes | Create folder |
| PATCH | `/api/bookmarks/groups/:groupId` | Yes | Update name/emoji, or `{ isDefault: true }` |
| DELETE | `/api/bookmarks/groups/:groupId` | Yes | Delete folder (not default); reassign bookmarks |
| GET | `/api/bookmarks/posts` | Yes | List saved posts (`groupId`, `q`, `sort`, `limit`) |
| POST | `/api/blog/p/:username/:slug/bookmark` | Yes | Toggle save + optional `groupId` |

---

## Data model (server)

**`BookmarkGroup`** (`server/src/models/BookmarkGroup.ts`)

| Field | Notes |
|-------|--------|
| `userId` | Owner |
| `name` | Unique per user |
| `emoji` | Optional; allowlist only |
| `isDefault` | One default per user |

**`BlogBookmark`** (`server/src/models/BlogBookmark.ts`)

| Field | Notes |
|-------|--------|
| `userId`, `postId` | Unique pair |
| `groupId` | Folder reference |
| `createdAt` | Sort order in library |

---

## UI components

| Component | Role |
|-----------|------|
| `BookmarkFolderChip` | Folder tab + default dot + ⋯ menu (edit/delete) |
| `BookmarkFolderFormDialog` | Create / edit name + emoji |
| `BookmarkFolderEmojiPicker` | Dropdown of allowed emojis + **None** |
| `ConfirmDialog` | Default-folder change, delete-folder confirm |

---

## Sidebar integration

`webapp/src/components/layout/nav/SidebarDrawer.tsx` loads groups and renders `BookmarkFolderAccordionLink` → `/bookmarks?group={id}` with emoji + name.

---

## Related docs

- Product help (seeded): `/docs/bookmarks` — `server/src/admin-platform/seeds/docsBlogsHelp.seedData.ts`
- Engagement overview: `docs/BLOG_RESPECT.md` (bookmarks are separate from Respect/Repost)

---

## Flow diagram

```mermaid
flowchart TD
  A[User on feed or post] --> B{Bookmark tap}
  B -->|Save| C[POST /api/blog/.../bookmark]
  B -->|Unsave| C
  C --> D[Resolve groupId or default folder]
  D --> E[(BlogBookmark + bookmarkCount)]

  F[/bookmarks page] --> G[GET /groups]
  F --> H[GET /posts]
  G --> I[Folder chips]
  I --> J[Create / Edit / Delete / Default]
  J --> K[POST/PATCH/DELETE /api/bookmarks/groups]
  I --> L[Filter posts by groupId]
  L --> H
```
