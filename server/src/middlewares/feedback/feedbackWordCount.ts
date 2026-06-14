export const FEEDBACK_MIN_DESC_WORDS = 20;
export function countFeedbackWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
