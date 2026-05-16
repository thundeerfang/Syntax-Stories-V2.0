'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { FolderOpen, LayoutGrid, Rss, SlidersHorizontal, Tags, X } from 'lucide-react';
import { toast } from 'sonner';
import { blogApi } from '@/api/blog';
import { squadsApi } from '@/api/squads';
import { Button } from '@/components/ui/Button';
import { FormDialog } from '@/components/ui/FormDialog';
import type { BlogTaxonomyRow } from '@/types/blog';
import { cn } from '@/lib/utils';
import type { CustomFeedRules, CustomFeedSort, CustomFeedTimeRange } from '@/lib/applyCustomFeedRules';
import { defaultRules, useCustomFeedsStore } from '@/store/customFeeds';

const FEED_NAME_MAX = 50;

const ICON_PRESETS = ['🔥', '📡', '💡', '🛠️', '🧪', '🚀', '📚', '🎯', '⚡', '🌐', '💜', '🧠'] as const;

const SORT_OPTIONS: { value: CustomFeedSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_respected', label: 'Most respect' },
  { value: 'most_reposted', label: 'Most reposts' },
  { value: 'most_commented', label: 'Most comments' },
  { value: 'most_bookmarked', label: 'Most bookmarks' },
];

const TIME_OPTIONS: { value: CustomFeedTimeRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

/** Fixed minimum-count tiers (maps to stored number; empty = no filter). */
const THRESHOLD_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '5', label: '5+' },
  { value: '10', label: '10+' },
  { value: '25', label: '25+' },
  { value: '50', label: '50+' },
  { value: '100', label: '100+' },
  { value: '250', label: '250+' },
  { value: '500', label: '500+' },
];

type SidebarTab = 'general' | 'tags' | 'categories' | 'sources' | 'filters';

function normSlug(s: string): string {
  return s.trim().toLowerCase();
}

function Chip({
  label,
  onRemove,
}: Readonly<{
  label: string;
  onRemove: () => void;
}>) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-none border-2 border-border bg-muted/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-foreground">
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${label}`}
      >
        <X className="size-3.5" strokeWidth={2.5} aria-hidden />
      </button>
    </span>
  );
}

export function NewCustomFeedDialog() {
  const open = useCustomFeedsStore((s) => s.newFeedDialogOpen);
  const close = useCustomFeedsStore((s) => s.closeNewFeedDialog);
  const addFeed = useCustomFeedsStore((s) => s.addFeed);

  const [tab, setTab] = useState<SidebarTab>('general');
  const [name, setName] = useState('My new feed');
  const [iconEmoji, setIconEmoji] = useState('📡');
  const [makeDefault, setMakeDefault] = useState(false);
  const [rules, setRules] = useState<CustomFeedRules>(() => defaultRules());
  const [tagQuery, setTagQuery] = useState('');
  const [sourceSubTab, setSourceSubTab] = useState<'squads' | 'users'>('squads');
  const [sourceSearch, setSourceSearch] = useState('');
  const [taxonomy, setTaxonomy] = useState<{ tags: BlogTaxonomyRow[]; categories: BlogTaxonomyRow[] }>({
    tags: [],
    categories: [],
  });
  const [squads, setSquads] = useState<{ slug: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab('general');
    setName('My new feed');
    setIconEmoji('📡');
    setMakeDefault(false);
    setRules(defaultRules());
    setTagQuery('');
    setSourceSubTab('squads');
    setSourceSearch('');
    let cancelled = false;
    void (async () => {
      try {
        const [tax, sq] = await Promise.all([
          blogApi.getTaxonomy(),
          squadsApi.listPublic({ limit: 60 }),
        ]);
        if (!cancelled) {
          setTaxonomy({ tags: tax.tags ?? [], categories: tax.categories ?? [] });
          setSquads((sq.squads ?? []).map((s) => ({ slug: s.slug, name: s.name })));
        }
      } catch {
        if (!cancelled) {
          setTaxonomy({ tags: [], categories: [] });
          setSquads([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const nameLen = name.length;
  const suggestedTags = useMemo(() => {
    const q = normSlug(tagQuery);
    return taxonomy.tags
      .filter((t) => (q ? normSlug(t.slug).includes(q) || normSlug(t.name ?? '').includes(q) : true))
      .slice(0, 14);
  }, [taxonomy.tags, tagQuery]);

  const sortedCategories = useMemo(() => {
    return [...taxonomy.categories].sort((a, b) =>
      (a.name ?? a.slug).localeCompare(b.name ?? b.slug, undefined, { sensitivity: 'base' }),
    );
  }, [taxonomy.categories]);

  const filteredSquads = useMemo(() => {
    const q = normSlug(sourceSearch);
    if (!q) return squads.slice(0, 20);
    return squads.filter((s) => s.slug.includes(q) || normSlug(s.name).includes(q)).slice(0, 20);
  }, [squads, sourceSearch]);

  const addTag = useCallback((slug: string) => {
    const s = normSlug(slug);
    if (!s) return;
    setRules((r) => (r.tagSlugs.includes(s) ? r : { ...r, tagSlugs: [...r.tagSlugs, s] }));
  }, []);

  const addSquad = useCallback((slug: string) => {
    const s = normSlug(slug);
    if (!s) return;
    setRules((r) =>
      r.squadSources.includes(s) ? r : { ...r, squadSources: [...r.squadSources, s] },
    );
  }, []);

  const addUserFromInput = useCallback(() => {
    const raw = sourceSearch.trim().replace(/^@/, '');
    const s = normSlug(raw);
    if (!s) return;
    setRules((r) =>
      r.userSources.includes(s) ? r : { ...r, userSources: [...r.userSources, s] },
    );
    setSourceSearch('');
  }, [sourceSearch]);

  const onSave = useCallback(async () => {
    const n = name.trim();
    if (!n) {
      toast.error('Enter a feed name');
      return;
    }
    if (n.length > FEED_NAME_MAX) {
      toast.error(`Name must be ${FEED_NAME_MAX} characters or less`);
      return;
    }
    setSubmitting(true);
    try {
      addFeed({
        name: n,
        iconEmoji: iconEmoji.trim() || '📡',
        isDefault: makeDefault,
        rules,
      });
      toast.success('Feed created');
      close();
    } finally {
      setSubmitting(false);
    }
  }, [addFeed, close, iconEmoji, makeDefault, name, rules]);

  const sidebarBtn = (id: SidebarTab, label: string, Icon: ComponentType<{ className?: string; strokeWidth?: number }>) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'flex w-full items-center gap-2 rounded-none border-2 px-2.5 py-2 text-left font-mono text-[10px] font-black uppercase tracking-widest transition-colors sm:gap-3 sm:px-3 sm:py-2.5',
        tab === id
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-transparent bg-transparent text-foreground/80 hover:bg-muted/50',
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="min-w-0 leading-tight">{label}</span>
    </button>
  );

  const handleClose = useCallback(() => {
    if (!submitting) close();
  }, [submitting, close]);

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      titleId="new-custom-feed-title"
      title="New feed"
      titleIcon={<Rss strokeWidth={2.25} aria-hidden />}
      subtitle="Tune what you see on the home feed. Rules apply on this device until we sync them to your account."
      interactionLock={submitting}
      panelClassName="w-[min(100vw-1rem,56rem)] max-w-[calc(100vw-1rem)] max-h-[min(90vh,820px)] border-2 border-border shadow-[4px_4px_0_0_var(--border)]"
      bodyClassName="p-0"
      footerClassName="flex flex-wrap justify-end gap-2"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" disabled={submitting} onClick={() => void onSave()}>
            {submitting ? 'Saving…' : 'Create feed'}
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 overflow-hidden border-t-2 border-border">
          <nav
            className="flex w-[7.25rem] shrink-0 flex-col gap-0.5 border-r-2 border-border bg-muted/20 p-1.5 sm:w-44 sm:gap-1 sm:p-2"
            aria-label="Feed setup sections"
          >
            {sidebarBtn('general', 'General', LayoutGrid)}
            {sidebarBtn('tags', 'Tags', Tags)}
            {sidebarBtn('categories', 'Categories', FolderOpen)}
            {sidebarBtn('sources', 'Sources', Rss)}
            {sidebarBtn('filters', 'Filters', SlidersHorizontal)}
          </nav>

          <div className="ss-scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
            {tab === 'general' ? (
              <div className="space-y-8">
                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">Feed name</h3>
                  <p className="text-xs text-muted-foreground">Choose a name that reflects the focus of your feed.</p>
                  <label className="block space-y-1.5">
                    <span className="sr-only">Enter feed name</span>
                    <input
                      value={name}
                      maxLength={FEED_NAME_MAX}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 w-full rounded-none border-2 border-border bg-background px-3 font-mono text-sm outline-none ring-primary focus-visible:ring-2"
                      placeholder="My new feed"
                      autoComplete="off"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                      {FEED_NAME_MAX - nameLen} characters left
                    </span>
                  </label>
                </section>

                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">Choose an icon</h3>
                  <div className="flex flex-wrap gap-2">
                    {ICON_PRESETS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setIconEmoji(e)}
                        className={cn(
                          'flex size-11 items-center justify-center border-2 text-lg transition-colors',
                          iconEmoji === e
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:bg-muted/50',
                        )}
                        aria-label={`Icon ${e}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </section>

                <label className="flex cursor-pointer items-start gap-3 border-2 border-border bg-muted/20 p-3">
                  <input
                    type="checkbox"
                    checked={makeDefault}
                    onChange={(e) => setMakeDefault(e.target.checked)}
                    className="mt-1 size-4 shrink-0 rounded-sm border-2 border-border accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-black uppercase tracking-wide text-foreground">
                      Set as your default feed
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Make this feed the first one you see every time you open Syntax Stories.
                    </span>
                  </span>
                </label>
              </div>
            ) : null}

            {tab === 'tags' ? (
              <div className="space-y-6">
                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">Search tags</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Tags are a strong starting signal for your feed. As you engage with content, live activity can weigh
                    more over time.
                  </p>
                  <input
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    placeholder="Search tags…"
                    className="h-10 w-full rounded-none border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                  />
                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Suggested</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => addTag(t.slug)}
                        className="rounded-none border-2 border-border bg-card px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide hover:border-primary hover:text-primary"
                      >
                        {t.name ?? t.slug}
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">My tags</p>
                  <div className="flex flex-wrap gap-2">
                    {rules.tagSlugs.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None yet — add from suggested above.</span>
                    ) : (
                      rules.tagSlugs.map((s) => (
                        <Chip
                          key={s}
                          label={s}
                          onRemove={() =>
                            setRules((r) => ({ ...r, tagSlugs: r.tagSlugs.filter((x) => x !== s) }))
                          }
                        />
                      ))
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {tab === 'categories' ? (
              <div className="space-y-6">
                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">Categories</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Choose one or more categories from the server taxonomy. Hold{' '}
                    <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">⌘</kbd> /{' '}
                    <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">Ctrl</kbd> to
                    select multiple.
                  </p>
                  {sortedCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No categories loaded yet.</p>
                  ) : (
                    <select
                      multiple
                      value={rules.categorySlugs}
                      onChange={(e) => {
                        const slugs = Array.from(e.target.selectedOptions, (o) => normSlug(o.value));
                        setRules((r) => ({ ...r, categorySlugs: slugs }));
                      }}
                      aria-label="Categories from server"
                      size={Math.min(12, Math.max(6, sortedCategories.length))}
                      className="w-full max-w-md rounded-none border-2 border-border bg-background px-2 py-1 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                    >
                      {sortedCategories.map((c) => {
                        const slug = normSlug(c.slug);
                        return (
                          <option key={c.slug} value={slug}>
                            {c.name ?? c.slug}
                            {typeof c.postCount === 'number' ? ` (${c.postCount})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </section>
              </div>
            ) : null}

            {tab === 'sources' ? (
              <div className="space-y-6">
                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Search sources, squads, or users
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Following squads and authors steers where posts come from. Leave empty to include all sources.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSourceSubTab('squads')}
                      className={cn(
                        'rounded-none border-2 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest',
                        sourceSubTab === 'squads'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card',
                      )}
                    >
                      Squads
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceSubTab('users')}
                      className={cn(
                        'rounded-none border-2 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest',
                        sourceSubTab === 'users'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card',
                      )}
                    >
                      Users
                    </button>
                  </div>
                  <input
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && sourceSubTab === 'users') {
                        e.preventDefault();
                        addUserFromInput();
                      }
                    }}
                    placeholder={sourceSubTab === 'squads' ? 'Filter squads…' : 'Type @username and press Enter'}
                    className="h-10 w-full rounded-none border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                  />
                  {sourceSubTab === 'squads' ? (
                    <ul className="max-h-48 space-y-1 overflow-y-auto border-2 border-border bg-muted/10 p-2">
                      {filteredSquads.map((s) => (
                        <li key={s.slug}>
                          <button
                            type="button"
                            onClick={() => addSquad(s.slug)}
                            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left font-mono text-[10px] font-bold uppercase tracking-wide hover:bg-muted/60"
                          >
                            <span className="min-w-0 truncate">{s.name}</span>
                            <span className="shrink-0 text-muted-foreground">@{s.slug}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Press Enter to add a username. Chips appear below.</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rules.squadSources.map((s) => (
                      <Chip
                        key={s}
                        label={`squad:${s}`}
                        onRemove={() =>
                          setRules((r) => ({ ...r, squadSources: r.squadSources.filter((x) => x !== s) }))
                        }
                      />
                    ))}
                    {rules.userSources.map((s) => (
                      <Chip
                        key={s}
                        label={`@${s}`}
                        onRemove={() =>
                          setRules((r) => ({ ...r, userSources: r.userSources.filter((x) => x !== s) }))
                        }
                      />
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {tab === 'filters' ? (
              <div className="space-y-8">
                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Set default sorting
                  </h3>
                  <p className="text-xs text-muted-foreground">Choose how posts are ordered in your feed.</p>
                  <select
                    value={rules.sort}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, sort: e.target.value as CustomFeedSort }))
                    }
                    className="h-11 w-full max-w-md rounded-none border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </section>

                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Filter by time range
                  </h3>
                  <p className="text-xs text-muted-foreground">Include only posts published within a window.</p>
                  <select
                    value={rules.timeRange}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, timeRange: e.target.value as CustomFeedTimeRange }))
                    }
                    className="h-11 w-full max-w-md rounded-none border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                  >
                    {TIME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </section>

                <section className="space-y-3">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Content thresholds
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Minimum counts — choose <span className="font-mono">—</span> for no minimum, or a fixed tier.
                  </p>
                  <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['minRespect', 'Respect'],
                        ['minRepost', 'Reposts'],
                        ['minComment', 'Comments'],
                        ['minBookmark', 'Bookmarks'],
                      ] as const
                    ).map(([key, label]) => {
                      const raw = rules[key];
                      const inList =
                        raw != null && THRESHOLD_OPTIONS.some((o) => o.value === String(raw));
                      return (
                        <label key={key} className="block space-y-1">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            Min {label}
                          </span>
                          <select
                            value={raw == null ? '' : String(raw)}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRules((r) => ({
                                ...r,
                                [key]: v === '' ? null : Number(v),
                              }));
                            }}
                            className="h-10 w-full rounded-none border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                          >
                            {THRESHOLD_OPTIONS.map((o) => (
                              <option key={o.value === '' ? 'none' : o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                            {raw != null && !inList ? (
                              <option value={String(raw)}>{raw}+ (saved)</option>
                            ) : null}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
