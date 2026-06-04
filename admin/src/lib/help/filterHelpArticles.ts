import type { HelpListItem } from '@/lib/api';

export type HelpArticleFilter = 'all' | 'published' | 'draft';
export type HelpArticleSort = 'newest' | 'oldest';

export function filterAndSortHelpArticles(
  items: HelpListItem[],
  opts: { search: string; filter: HelpArticleFilter; sort: HelpArticleSort }
): HelpListItem[] {
  const q = opts.search.trim().toLowerCase();
  let rows = items;

  if (opts.filter === 'published') {
    rows = rows.filter((r) => r.isPublished);
  } else if (opts.filter === 'draft') {
    rows = rows.filter((r) => !r.isPublished || r.status === 'draft');
  }

  if (q) {
    rows = rows.filter((r) => {
      const haystack = [r.title, r.slug].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  const sorted = [...rows];
  sorted.sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return opts.sort === 'oldest' ? ta - tb : tb - ta;
  });

  return sorted;
}
