import type { Block } from '@/types';

export interface BlogHeadingTocItem {
  anchorId: string;
  text: string;
  level: 2 | 3;
}

export function extractBlogHeadingToc(blocks: Block[]): BlogHeadingTocItem[] {
  const out: BlogHeadingTocItem[] = [];
  for (const b of blocks) {
    if (b.type !== 'heading') continue;
    const p = (b.payload ?? {}) as { text?: string; level?: number };
    const text = typeof p.text === 'string' ? p.text.trim() : '';
    if (!text) continue;
    const level = p.level === 3 ? 3 : 2;
    out.push({ anchorId: `blog-heading-${b.id}`, text, level });
  }
  return out;
}
