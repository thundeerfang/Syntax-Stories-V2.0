/**
 * Bookmarks JSON API — `/api/bookmarks/*`.
 * Keep in sync with `server/src/routes/bookmark.routes.ts`.
 * Emoji allowlist: keep in sync with `server/src/lib/bookmarkFolderEmojis.ts`.
 */

/** Curated folder emojis shown in the picker (no free-text emoji). */
export const BOOKMARK_FOLDER_EMOJIS = [
  '📚',
  '🔖',
  '💡',
  '⭐',
  '🎯',
  '🚀',
  '💻',
  '📝',
  '🎨',
  '🎮',
  '🏠',
  '❤️',
  '🔥',
  '✨',
  '📌',
  '🗂️',
  '🌟',
  '💼',
  '🧠',
  '🔬',
  '📖',
] as const;

export type BookmarkFolderEmoji = (typeof BOOKMARK_FOLDER_EMOJIS)[number];

export function isAllowedBookmarkFolderEmoji(value: string): value is BookmarkFolderEmoji {
  return (BOOKMARK_FOLDER_EMOJIS as readonly string[]).includes(value);
}

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
