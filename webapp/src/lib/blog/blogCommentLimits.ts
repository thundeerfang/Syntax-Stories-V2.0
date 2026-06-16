import { countWordsInPlainText } from "@/lib/blog/writeWorkspaceStats";

export const BLOG_COMMENT_MIN_WORDS = 1;
export const BLOG_COMMENT_MAX_WORDS = 80;

export function commentDocHasInlineGif(doc: unknown): boolean {
  try {
    return JSON.stringify(doc ?? {}).includes('"inlineGif"');
  } catch {
    return false;
  }
}

export function countCommentWordsFromPlainText(text: string): number {
  return countWordsInPlainText(text);
}

export function validateCommentDraft(
  plainText: string,
  doc: unknown,
): string | null {
  const trimmed = plainText.trim();
  const hasGif = commentDocHasInlineGif(doc);
  const words = countCommentWordsFromPlainText(trimmed);
  if (words < BLOG_COMMENT_MIN_WORDS && !hasGif) {
    return `Comment must be at least ${BLOG_COMMENT_MIN_WORDS} word.`;
  }
  if (words > BLOG_COMMENT_MAX_WORDS) {
    return `Comment must be at most ${BLOG_COMMENT_MAX_WORDS} words (${words} used).`;
  }
  return null;
}

export function isCommentDraftSubmittable(
  plainText: string,
  doc: unknown,
): boolean {
  const trimmed = plainText.trim();
  if (!trimmed && !commentDocHasInlineGif(doc)) return false;
  return validateCommentDraft(plainText, doc) === null;
}
