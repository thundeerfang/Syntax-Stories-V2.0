'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchDialogStore } from '@/store/searchDialog';
import { Dialog } from '@/components/ui';
import { searchApi } from '@/api/search';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
  type SearchGroups,
  type SearchHit,
} from '@contracts/searchApi';
import {
  countSearchHits,
  flattenSearchGroups,
  groupedEntries,
} from '@/lib/search/flattenGroups';
import { isSearchQueryReady, normalizeSearchQuery, searchQueryCharCount } from '@/lib/search/normalizeQuery';
import { SearchGroupSection } from './SearchGroupSection';
import {
  Search,
  X,
  Loader2,
  Command,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/core/utils';

export function SearchDialog() {
  const { isOpen, close } = useSearchDialogStore();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroups>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState(0);

  const trimmed = normalizeSearchQuery(query);
  const charCount = searchQueryCharCount(query);
  const queryReady = isSearchQueryReady(query);

  const flatHits = useMemo(() => flattenSearchGroups(groups), [groups]);
  const sections = useMemo(() => groupedEntries(groups), [groups]);
  const sectionsWithOffsets = useMemo(
    () =>
      sections.map(([groupKey, hits], index) => ({
        groupKey,
        hits,
        flatOffset: sections.slice(0, index).reduce((total, [, groupHits]) => total + groupHits.length, 0),
      })),
    [sections]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setGroups({});
      setSelectedIndex(0);
      setLoading(false);
      setTookMs(null);
      setMatchCount(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const runSearch = useCallback((q: string) => {
    if (!isSearchQueryReady(q)) {
      setGroups({});
      setLoading(false);
      setTookMs(null);
      setMatchCount(0);
      return;
    }

    const id = ++requestIdRef.current;
    setLoading(true);

    searchApi
      .unified(q, { limit: 5 })
      .then((res) => {
        if (requestIdRef.current !== id) return;
        setGroups(res.groups ?? {});
        setTookMs(res.tookMs ?? null);
        setMatchCount(countSearchHits(res.groups ?? {}));
        setSelectedIndex(0);
      })
      .catch(() => {
        if (requestIdRef.current === id) {
          setGroups({});
          setMatchCount(0);
        }
      })
      .finally(() => {
        if (requestIdRef.current === id) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmed) {
      setGroups({});
      setLoading(false);
      setTookMs(null);
      setMatchCount(0);
      return;
    }

    if (!queryReady) {
      setGroups({});
      setLoading(false);
      setTookMs(null);
      setMatchCount(0);
      setSelectedIndex(0);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, queryReady, runSearch]);

  useEffect(() => {
    setMatchCount(flatHits.length);
  }, [flatHits.length]);

  const handlePick = useCallback(
    (hit: SearchHit) => {
      router.push(hit.href);
      close();
    },
    [router, close]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatHits.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && flatHits[selectedIndex]) {
      e.preventDefault();
      handlePick(flatHits[selectedIndex]);
    }
  };

  let footerStatusLabel = 'System_Ready';
  if (loading) {
    footerStatusLabel = 'Fetching_Data...';
  } else if (trimmed && charCount < SEARCH_MIN_CHARS) {
    footerStatusLabel = `Min_${SEARCH_MIN_CHARS}_Chars`;
  } else if (matchCount > 0) {
    footerStatusLabel = `Matches: ${matchCount}`;
  } else if (trimmed && queryReady && !loading) {
    footerStatusLabel = 'No_Matches';
  }

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      titleId="search-dialog-title"
      panelClassName={cn(
        'pointer-events-auto w-full max-w-xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden border-2 sm:border-4 border-border bg-background',
        'max-sm:shadow-none sm:shadow'
      )}
      contentClassName="relative p-0"
      showCloseButton={false}
    >
      <div className="border-b-2 sm:border-b-4 border-border bg-card text-card-foreground">
        <div
          id="search-dialog-title"
          className="flex items-center justify-between border-b border-border sm:border-b-2 bg-primary px-3 py-2 text-primary-foreground sm:px-4"
        >
          <div className="flex items-center gap-2">
            <Command className="size-3 shrink-0 text-primary-foreground" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Command_Palette
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="flex items-center gap-3 bg-muted/50 px-4 py-5 dark:bg-muted/30">
            <span className="font-mono text-xl font-black text-primary" aria-hidden="true">
              {'>'}
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search people, posts, topics, squads..."
              className="flex-1 bg-transparent text-lg font-mono font-black uppercase text-foreground outline-none placeholder:text-muted-foreground/30 placeholder:normal-case placeholder:font-bold"
              autoComplete="off"
            />
            {loading ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" strokeWidth={3} />
            ) : null}
          </div>
        </form>
      </div>

      <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden bg-muted/10">
        <AnimatePresence mode="popLayout">
          {!trimmed ? (
            <div className="p-4 sm:p-8">
              <div className="border-0 p-6 text-center sm:border-4 sm:border-dashed sm:border-border/40 sm:bg-background/50 sm:p-8">
                <Search className="mx-auto mb-3 size-8 text-muted-foreground/20" strokeWidth={3} />
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
                  Search stories, tags, squads, and people
                </p>
                <p className="mt-2 text-[10px] font-bold text-muted-foreground/40">
                  Type at least {SEARCH_MIN_CHARS} characters
                </p>
              </div>
              <div className="mt-8 flex justify-center gap-6">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-muted-foreground/60">
                  <span className="flex flex-col gap-0.5">
                    <span className="border border-border bg-background p-0.5">
                      <ArrowUp className="size-2" />
                    </span>
                    <span className="border border-border bg-background p-0.5">
                      <ArrowDown className="size-2" />
                    </span>
                  </span>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-muted-foreground/60">
                  <span className="border border-border bg-background px-1.5 py-1">ESC</span>
                  <span>Close</span>
                </div>
              </div>
            </div>
          ) : charCount > 0 && charCount < SEARCH_MIN_CHARS ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
              <p className="text-center text-[11px] font-black uppercase text-muted-foreground">
                Type {SEARCH_MIN_CHARS - charCount} more character
                {SEARCH_MIN_CHARS - charCount === 1 ? '' : 's'} to search
              </p>
            </motion.div>
          ) : flatHits.length === 0 && !loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 text-center">
              <Search className="mx-auto mb-4 size-12 text-muted-foreground/20" />
              <p className="text-xs font-black uppercase text-muted-foreground">
                No matches for: <span className="text-foreground">{query}</span>
              </p>
            </motion.div>
          ) : (
            <div role="listbox" className="flex flex-col">
              {sectionsWithOffsets.map(({ groupKey, hits, flatOffset }) => (
                <SearchGroupSection
                  key={groupKey}
                  groupKey={groupKey}
                  hits={hits}
                  selectedIndex={selectedIndex}
                  flatOffset={flatOffset}
                  onPick={handlePick}
                  onHoverIndex={setSelectedIndex}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between border-t-2 border-border bg-background px-3 py-2 sm:border-t-4 sm:px-4">
        <div className="flex items-center gap-2">
          <div className={cn('size-1.5', loading ? 'animate-pulse bg-primary' : 'bg-primary/70')} />
          <span className="text-[9px] font-black uppercase text-muted-foreground">
            {footerStatusLabel}
          </span>
        </div>
        <span className="text-[9px] font-black uppercase text-muted-foreground/30">
          {tookMs != null ? `${Math.round(tookMs)}ms` : 'Query_v3'}
        </span>
      </div>
    </Dialog>
  );
}
