import type { ContactLeadListItem } from '@/lib/api';

export type ContactLeadFilter = 'all' | 'members' | 'guests' | 'with_company';
export type ContactLeadSort = 'newest' | 'oldest';

export function filterAndSortContactLeads(
  items: ContactLeadListItem[],
  opts: { search: string; filter: ContactLeadFilter; sort: ContactLeadSort }
): ContactLeadListItem[] {
  const q = opts.search.trim().toLowerCase();
  let rows = items;

  if (opts.filter === 'members') {
    rows = rows.filter((r) => Boolean(r.userId));
  } else if (opts.filter === 'guests') {
    rows = rows.filter((r) => !r.userId);
  } else if (opts.filter === 'with_company') {
    rows = rows.filter((r) => Boolean(r.company?.trim()));
  }

  if (q) {
    rows = rows.filter((r) => {
      const haystack = [r.fullName, r.email, r.topic, r.company ?? '', r.username ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  const sorted = [...rows];
  sorted.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return opts.sort === 'oldest' ? ta - tb : tb - ta;
  });

  return sorted;
}
