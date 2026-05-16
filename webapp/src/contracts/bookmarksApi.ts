/**
 * Bookmarks JSON API — `/api/bookmarks/*`.
 * Keep in sync with `server/src/routes/bookmark.routes.ts`.
 */

export type BookmarkGroupRow = {
  _id: string;
  name: string;
  emoji: string;
  isDefault: boolean;
  bookmarkCount?: number;
};

export interface CreateBookmarkGroupBody {
  name: string;
  emoji?: string;
  makeDefault?: boolean;
}

export interface PatchBookmarkGroupBody {
  name?: string;
  emoji?: string;
  makeDefault?: boolean;
}
