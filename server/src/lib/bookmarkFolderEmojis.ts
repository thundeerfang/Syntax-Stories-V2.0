/** Curated folder emojis — keep in sync with `webapp/src/contracts/bookmarksApi.ts`. */
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

const ALLOWED = new Set<string>(BOOKMARK_FOLDER_EMOJIS);

export function sanitizeBookmarkFolderEmoji(raw: string | undefined): string {
  if (raw == null || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return ALLOWED.has(trimmed) ? trimmed : '';
}
