export type MarkdownHeading = {
  id: string;
  level: number;
  text: string;
};

function slugifyHeading(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'section';
}

/** Extract ATX headings (# …) for a table of contents. */
export function parseMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const lines = markdown.split('\n');
  const counts = new Map<string, number>();
  const out: MarkdownHeading[] = [];

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/\s+#+\s*$/, '').trim();
    if (!text) continue;
    let id = slugifyHeading(text);
    const n = (counts.get(id) ?? 0) + 1;
    counts.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    out.push({ id, level, text });
  }

  return out;
}

export function nextDraftVersionLabel(publishedVersion: number, hasPublished: boolean): string {
  if (!hasPublished) return publishedVersion > 0 ? `v${publishedVersion}` : 'v1 (draft)';
  return `v${publishedVersion + 1} (next)`;
}
