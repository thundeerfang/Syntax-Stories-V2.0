/** True when stored content JSON is empty or only whitespace. */
export function isEmptyBlogContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (trimmed === '[]' || trimmed === '{}') return true;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed) && parsed.length === 0) return true;
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 0
    ) {
      return true;
    }
  } catch {
    /* keep as non-empty if not valid JSON */
  }
  return false;
}
