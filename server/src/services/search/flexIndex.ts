import type { SearchHit, SearchIndexDoc } from './search.types.js';
import { indexDocToHit } from './searchTaxonomy.service.js';

type IndexKind = 'tags' | 'categories' | 'squads' | 'features';

/** In-memory prefix/substring filter on warm Redis index docs (<5ms for ~5k rows). */
export function searchFlexIndex(
  _kind: IndexKind,
  docs: SearchIndexDoc[],
  q: string,
  limit: number
): SearchHit[] {
  if (docs.length === 0) return [];

  const needle = q.toLowerCase();
  const tokens = needle.split(/\s+/).filter(Boolean);

  const scored = docs
    .map((doc) => {
      const label = doc.label.toLowerCase();
      const blob = doc.tokens;
      let score = 0;
      if (label.startsWith(needle)) score += 100;
      else if (label.includes(needle)) score += 60;
      if (blob.includes(needle)) score += 40;
      for (const t of tokens) {
        if (label.includes(t) || blob.includes(t)) score += 10;
      }
      return { doc, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || (b.doc.rank ?? 0) - (a.doc.rank ?? 0));

  return scored.slice(0, limit).map((row) => indexDocToHit(row.doc));
}

export function invalidateFlexSearchBundles(): void {
  // no-op — kept for index rebuild hook compatibility
}
