export type DocsTocEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Extract h2/h3 headings from markdown for the sidebar table of contents. */
export function parseMarkdownHeadings(markdown: string): DocsTocEntry[] {
  const lines = markdown.split('\n');
  const entries: DocsTocEntry[] = [];
  const usedIds = new Map<string, number>();

  for (const line of lines) {
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    const raw = h2?.[1] ?? h3?.[1];
    if (!raw) continue;

    const text = raw.replace(/\[(.+?)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();
    if (!text) continue;

    const base = slugifyHeading(text) || 'section';
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;

    entries.push({ id, text, level: h2 ? 2 : 3 });
  }

  return entries;
}
