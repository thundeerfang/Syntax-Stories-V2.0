/** Strip basic HTML from rich summary for card excerpts. */
export function summaryToPlainText(htmlish: string): string {
  if (!htmlish?.trim()) return '';
  return htmlish
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
