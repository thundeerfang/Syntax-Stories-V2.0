import type { SearchGroupKey, SearchHit } from '@contracts/searchApi';
import { SEARCH_GROUP_LABELS } from '@contracts/searchApi';
import { SearchHitRow } from './SearchHitRow';

export function SearchGroupSection({
  groupKey,
  hits,
  selectedIndex,
  flatOffset,
  onPick,
  onHoverIndex,
}: Readonly<{
  groupKey: SearchGroupKey;
  hits: SearchHit[];
  selectedIndex: number;
  flatOffset: number;
  onPick: (hit: SearchHit) => void;
  onHoverIndex: (index: number) => void;
}>) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <p className="sticky top-0 z-10 border-b border-border/40 bg-muted/80 px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
        {SEARCH_GROUP_LABELS[groupKey]}
      </p>
      <ul className="divide-y divide-border/40" role="presentation">
        {hits.map((hit, i) => {
          const flatIndex = flatOffset + i;
          return (
            <li key={hit.id}>
              <SearchHitRow
                hit={hit}
                selected={selectedIndex === flatIndex}
                onPick={() => onPick(hit)}
                onHover={() => onHoverIndex(flatIndex)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
