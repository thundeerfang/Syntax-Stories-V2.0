import { SEARCH_FEATURES } from './featureCatalog.js';
import type { SearchHit, SearchIndexDoc } from './search.types.js';

export function featuresToIndexDocs(): SearchIndexDoc[] {
  return SEARCH_FEATURES.map((f) => ({
    id: f.id,
    type: 'feature' as const,
    label: f.label,
    href: f.href,
    tokens: [f.label, ...f.keywords].join(' ').toLowerCase(),
  }));
}

export function searchFeaturesForUnified(q: string, limit: number): SearchHit[] {
  const needle = q.toLowerCase();
  const hits: SearchHit[] = [];

  for (const f of SEARCH_FEATURES) {
    const hay = [f.label, ...f.keywords].join(' ').toLowerCase();
    if (hay.includes(needle) || f.label.toLowerCase().includes(needle)) {
      hits.push({
        id: f.id,
        type: 'feature',
        label: f.label,
        sublabel: 'App shortcut',
        href: f.href,
      });
    }
    if (hits.length >= limit) break;
  }

  return hits.slice(0, limit);
}
