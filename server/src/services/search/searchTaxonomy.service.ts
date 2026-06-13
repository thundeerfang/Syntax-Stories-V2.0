import {
  loadCategoryRows,
  loadTagRows,
  type TaxonomyCategoryRow,
  type TaxonomyTagRow,
} from '../blogTaxonomy.service.js';
import type { SearchHit, SearchIndexDoc } from './search.types.js';
import { escapeRegex } from './searchQuery.util.js';

function tagToHit(t: TaxonomyTagRow): SearchHit {
  return {
    id: `tag:${t.slug}`,
    type: 'tag',
    label: t.name,
    sublabel: `#${t.slug}`,
    href: `/topics/${encodeURIComponent(t.slug)}`,
    meta: { postCount: t.postCount },
  };
}

function categoryToHit(c: TaxonomyCategoryRow): SearchHit {
  return {
    id: `cat:${c.slug}`,
    type: 'category',
    label: c.name,
    sublabel: c.description?.trim() || `Category · ${c.slug}`,
    href: `/topics/category/${encodeURIComponent(c.slug)}`,
    meta: { postCount: c.postCount },
  };
}

export function tagsToIndexDocs(rows: TaxonomyTagRow[]): SearchIndexDoc[] {
  return rows.map((t) => ({
    id: `tag:${t.slug}`,
    type: 'tag',
    label: t.name,
    sublabel: `#${t.slug}`,
    href: `/topics/${encodeURIComponent(t.slug)}`,
    tokens: [t.name, t.slug].join(' ').toLowerCase(),
    rank: t.postCount,
    meta: { postCount: t.postCount },
  }));
}

export function categoriesToIndexDocs(rows: TaxonomyCategoryRow[]): SearchIndexDoc[] {
  return rows.map((c) => ({
    id: `cat:${c.slug}`,
    type: 'category',
    label: c.name,
    sublabel: c.description?.trim() || c.slug,
    href: `/topics/category/${encodeURIComponent(c.slug)}`,
    tokens: [c.name, c.slug, c.description].join(' ').toLowerCase(),
    rank: c.postCount,
    meta: { postCount: c.postCount },
  }));
}

function filterRows<T extends { name: string; slug: string }>(
  rows: T[],
  q: string,
  limit: number,
  toHit: (row: T) => SearchHit
): SearchHit[] {
  const regex = new RegExp(escapeRegex(q), 'i');
  const hits: SearchHit[] = [];
  for (const row of rows) {
    if (regex.test(row.name) || regex.test(row.slug)) {
      hits.push(toHit(row));
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

export async function searchTagsForUnified(q: string, limit: number): Promise<SearchHit[]> {
  const rows = await loadTagRows();
  return filterRows(rows, q, limit, tagToHit);
}

export async function searchCategoriesForUnified(
  q: string,
  limit: number
): Promise<SearchHit[]> {
  const rows = await loadCategoryRows();
  return filterRows(rows, q, limit, categoryToHit);
}

export function indexDocToHit(doc: SearchIndexDoc): SearchHit {
  return {
    id: doc.id,
    type: doc.type,
    label: doc.label,
    sublabel: doc.sublabel,
    href: doc.href,
    imageUrl: doc.imageUrl,
    meta: doc.meta,
  };
}
