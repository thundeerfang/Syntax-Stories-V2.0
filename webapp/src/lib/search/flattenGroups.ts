import {
  SEARCH_GROUP_ORDER,
  type SearchGroupKey,
  type SearchGroups,
  type SearchHit,
} from '@contracts/searchApi';

export function flattenSearchGroups(groups: SearchGroups): SearchHit[] {
  const flat: SearchHit[] = [];
  for (const key of SEARCH_GROUP_ORDER) {
    const hits = groups[key];
    if (hits?.length) flat.push(...hits);
  }
  return flat;
}

export function countSearchHits(groups: SearchGroups): number {
  let n = 0;
  for (const key of SEARCH_GROUP_ORDER) {
    n += groups[key]?.length ?? 0;
  }
  return n;
}

export function groupedEntries(groups: SearchGroups): Array<[SearchGroupKey, SearchHit[]]> {
  const out: Array<[SearchGroupKey, SearchHit[]]> = [];
  for (const key of SEARCH_GROUP_ORDER) {
    const hits = groups[key];
    if (hits?.length) out.push([key, hits]);
  }
  return out;
}
