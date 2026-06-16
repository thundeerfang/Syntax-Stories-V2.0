export const BLOG_COMMENT_MIN_WORDS = 1;
export const BLOG_COMMENT_MAX_WORDS = 80;
export const BLOG_COMMENT_MAX_SERIALIZED_CHARS = 50_000;

function extractTipTapPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === "string") return n.text;
  if (!Array.isArray(n.content)) return "";
  return n.content.map((child) => extractTipTapPlainText(child)).join("");
}

export function extractPlainTextFromCommentText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{") && trimmed.includes('"type"')) {
    try {
      const parsed = JSON.parse(trimmed) as { type?: string };
      if (parsed?.type === "doc") {
        return extractTipTapPlainText(parsed).trim();
      }
    } catch {
      /* fall through */
    }
  }
  return trimmed;
}

export function countCommentWords(text: string): number {
  const plain = extractPlainTextFromCommentText(text);
  const normalized = plain.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function commentTextHasInlineGif(text: string): boolean {
  return /"type"\s*:\s*"inlineGif"/.test(text);
}

export function validateBlogCommentText(text: string): string | null {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return "Comment cannot be empty.";
  if (trimmed.length > BLOG_COMMENT_MAX_SERIALIZED_CHARS) {
    return "Comment is too long.";
  }
  const words = countCommentWords(trimmed);
  const hasGif = commentTextHasInlineGif(trimmed);
  if (words < BLOG_COMMENT_MIN_WORDS && !hasGif) {
    return `Comment must be at least ${BLOG_COMMENT_MIN_WORDS} word.`;
  }
  if (words > BLOG_COMMENT_MAX_WORDS) {
    return `Comment must be at most ${BLOG_COMMENT_MAX_WORDS} words (${words} used).`;
  }
  return null;
}
