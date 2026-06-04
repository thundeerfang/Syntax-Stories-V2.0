/** Strip basic HTML from rich summary for card excerpts. */
export function summaryToPlainText(htmlish: string): string {
  if (!htmlish?.trim()) return '';
  return htmlish
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove empty paragraphs / stray breaks so the public post briefing does not show blank lines. */
export function sanitizePublicSummaryHtml(html: string): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<p>\s*(?:&nbsp;|\u00a0|\s|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/<div>\s*(?:&nbsp;|\u00a0|\s|<br\s*\/?>)*<\/div>/gi, '')
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br /><br />')
    .trim();
}
