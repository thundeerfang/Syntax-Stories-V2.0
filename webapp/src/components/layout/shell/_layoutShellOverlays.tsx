'use client';

/**
 * Layout shell overlays (P4) — feedback + custom feed dialogs.
 * Co-located with layout/shell/LayoutShell.tsx.
 */

import { useCallback, useEffect, useId, useMemo, useState, type ComponentType } from 'react';
import {
  CheckCircle2,
  FolderOpen,
  ImagePlus,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Rss,
  SlidersHorizontal,
  Tags,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAltchaChallengeUrl } from '@/api/auth';
import { blogApi } from '@/api/blog';
import {
  collectFeedbackClientMeta,
  fetchFeedbackCategories,
  submitFeedbackMultipart,
  FEEDBACK_MAX_IMAGE_BYTES,
  type FeedbackCategoryDto,
} from '@/api/feedback';
import { squadsApi } from '@/api/squads';
import { Button } from '@/components/ui';
import { FormDialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/feedback';
import { ImageUploadCropDialog } from '@/components/upload/ImageUploadCropDialog';
import { AltchaField, readAltchaPayload } from '@/components/auth';
import type {
  CustomFeedRules,
  CustomFeedSort,
  CustomFeedTimeRange,
} from '@/lib/feeds/applyCustomFeedRules';
import { captureScreenToFeedbackFile } from '@/lib/media/captureScreenToFeedbackFile';
import { validateFeedbackAttachmentFile } from '@/lib/media/feedbackAttachmentClient';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { defaultRules, useCustomFeedsStore } from '@/store/customFeeds';
import { useUIStore } from '@/store/ui';
import type { BlogTaxonomyRow } from '@/types/blog';

const FEED_NAME_MAX = 50;

const ICON_PRESETS = [
  '🔥',
  '📡',
  '💡',
  '🛠️',
  '🧪',
  '🚀',
  '📚',
  '🎯',
  '⚡',
  '🌐',
  '💜',
  '🧠',
] as const;

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
    <span className="inline-flex max-w-full items-center gap-1 border-2 border-border bg-muted/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-foreground">
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
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
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const isAuthed = isHydrated && Boolean(token && user);

  const [tab, setTab] = useState<SidebarTab>('general');
  const [name, setName] = useState('My new feed');
  const [iconEmoji, setIconEmoji] = useState('📡');
  const [makeDefault, setMakeDefault] = useState(false);
  const [rules, setRules] = useState<CustomFeedRules>(() => defaultRules());
  const [tagQuery, setTagQuery] = useState('');
  const [sourceSubTab, setSourceSubTab] = useState<'squads' | 'users'>('squads');
  const [sourceSearch, setSourceSearch] = useState('');
  const [taxonomy, setTaxonomy] = useState<{
    tags: BlogTaxonomyRow[];
    categories: BlogTaxonomyRow[];
  }>({
    tags: [],
    categories: [],
  });
  const [squads, setSquads] = useState<{ slug: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!isAuthed) {
      close();
      openAuth('login');
      return;
    }
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
  }, [open, isAuthed, close, openAuth]);

  const nameLen = name.length;
  const suggestedTags = useMemo(() => {
    const q = normSlug(tagQuery);
    return taxonomy.tags
      .filter((t) =>
        q ? normSlug(t.slug).includes(q) || normSlug(t.name ?? '').includes(q) : true
      )
      .slice(0, 14);
  }, [taxonomy.tags, tagQuery]);

  const sortedCategories = useMemo(() => {
    return [...taxonomy.categories].sort((a, b) =>
      (a.name ?? a.slug).localeCompare(b.name ?? b.slug, undefined, { sensitivity: 'base' })
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
      r.squadSources.includes(s) ? r : { ...r, squadSources: [...r.squadSources, s] }
    );
  }, []);

  const addUserFromInput = useCallback(() => {
    const raw = sourceSearch.trim().replace(/^@/, '');
    const s = normSlug(raw);
    if (!s) return;
    setRules((r) => (r.userSources.includes(s) ? r : { ...r, userSources: [...r.userSources, s] }));
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

  const sidebarBtn = (
    id: SidebarTab,
    label: string,
    Icon: ComponentType<{ className?: string; strokeWidth?: number }>
  ) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'flex w-full items-center gap-2  border-2 px-2.5 py-2 text-left font-mono text-[10px] font-black uppercase tracking-widest transition-colors sm:gap-3 sm:px-3 sm:py-2.5',
        tab === id
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-transparent bg-transparent text-foreground/80 hover:bg-muted/50'
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
      panelClassName="w-[min(100vw-1rem,56rem)] max-w-[calc(100vw-1rem)] max-h-[min(90vh,820px)] border-2 border-border shadow"
      bodyClassName="p-0"
      footerClassName="flex flex-wrap justify-end gap-2"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={submitting}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={submitting}
            onClick={() => void onSave()}
          >
            Create feed
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
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Feed name
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Choose a name that reflects the focus of your feed.
                  </p>
                  <label className="block space-y-1.5">
                    <span className="sr-only">Enter feed name</span>
                    <input
                      value={name}
                      maxLength={FEED_NAME_MAX}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 w-full border-2 border-border bg-background px-3 font-mono text-sm outline-none ring-primary focus-visible:ring-2"
                      placeholder="My new feed"
                      autoComplete="off"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                      {FEED_NAME_MAX - nameLen} characters left
                    </span>
                  </label>
                </section>

                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Choose an icon
                  </h3>
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
                            : 'border-border bg-card hover:bg-muted/50'
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
                    className="mt-1 size-4 shrink-0 border-2 border-border accent-primary"
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
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Search tags
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Tags are a strong starting signal for your feed. As you engage with content,
                    live activity can weigh more over time.
                  </p>
                  <input
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    placeholder="Search tags…"
                    className="h-10 w-full border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                  />
                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Suggested
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => addTag(t.slug)}
                        className="border-2 border-border bg-card px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide hover:border-primary hover:text-primary"
                      >
                        {t.name ?? t.slug}
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    My tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rules.tagSlugs.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        None yet — add from suggested above.
                      </span>
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
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                    Categories
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Choose one or more categories from the server taxonomy. Hold{' '}
                    <kbd className="border border-border bg-muted px-1 font-mono text-[10px]">
                      ⌘
                    </kbd>{' '}
                    /{' '}
                    <kbd className="border border-border bg-muted px-1 font-mono text-[10px]">
                      Ctrl
                    </kbd>{' '}
                    to select multiple.
                  </p>
                  {sortedCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No categories loaded yet.</p>
                  ) : (
                    <select
                      multiple
                      value={rules.categorySlugs}
                      onChange={(e) => {
                        const slugs = Array.from(e.target.selectedOptions, (o) =>
                          normSlug(o.value)
                        );
                        setRules((r) => ({ ...r, categorySlugs: slugs }));
                      }}
                      aria-label="Categories from server"
                      size={Math.min(12, Math.max(6, sortedCategories.length))}
                      className="w-full max-w-md border-2 border-border bg-background px-2 py-1 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
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
                    Following squads and authors steers where posts come from. Leave empty to
                    include all sources.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSourceSubTab('squads')}
                      className={cn(
                        ' border-2 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest',
                        sourceSubTab === 'squads'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card'
                      )}
                    >
                      Squads
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceSubTab('users')}
                      className={cn(
                        ' border-2 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest',
                        sourceSubTab === 'users'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card'
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
                    placeholder={
                      sourceSubTab === 'squads'
                        ? 'Filter squads…'
                        : 'Type @username and press Enter'
                    }
                    className="h-10 w-full border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
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
                    <p className="text-[10px] text-muted-foreground">
                      Press Enter to add a username. Chips appear below.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rules.squadSources.map((s) => (
                      <Chip
                        key={s}
                        label={`squad:${s}`}
                        onRemove={() =>
                          setRules((r) => ({
                            ...r,
                            squadSources: r.squadSources.filter((x) => x !== s),
                          }))
                        }
                      />
                    ))}
                    {rules.userSources.map((s) => (
                      <Chip
                        key={s}
                        label={`@${s}`}
                        onRemove={() =>
                          setRules((r) => ({
                            ...r,
                            userSources: r.userSources.filter((x) => x !== s),
                          }))
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
                  <p className="text-xs text-muted-foreground">
                    Choose how posts are ordered in your feed.
                  </p>
                  <select
                    value={rules.sort}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, sort: e.target.value as CustomFeedSort }))
                    }
                    className="h-11 w-full max-w-md border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
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
                  <p className="text-xs text-muted-foreground">
                    Include only posts published within a window.
                  </p>
                  <select
                    value={rules.timeRange}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, timeRange: e.target.value as CustomFeedTimeRange }))
                    }
                    className="h-11 w-full max-w-md border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
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
                    Minimum counts — choose <span className="font-mono">—</span> for no minimum, or
                    a fixed tier.
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
                            className="h-10 w-full border-2 border-border bg-background px-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
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

const MAX_FN = 80;
const MAX_LN = 80;
const MAX_EMAIL = 254;
const MAX_SUBJECT = 200;
const MAX_DESC = 5000;
const MIN_DESC = 10;

/** Stable id so footer submit can target the form via `form` attribute. */
const FEEDBACK_FORM_ID = 'syntax-feedback-form';

const FEEDBACK_SUBTITLE = "What's working, what isn't, or what you'd like next.";

/** During tab/window capture, hide modal pixels so `getDisplayMedia` screenshots show the page behind. */
const FEEDBACK_CAPTURE_HIDE_UI_CLASS = 'invisible pointer-events-none';

/** Busy overlay: mirrors success step layout (icon, copy, full-width close). */
function FeedbackSuccessSubmitSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-6 py-5 text-center">
      <div className="flex w-full max-w-md flex-1 flex-col justify-center space-y-6 py-4">
        <Skeleton className="mx-auto size-14 shrink-0" />
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-52 max-w-[90%]" />
          <Skeleton className="mx-auto h-3 w-full" />
          <Skeleton className="mx-auto h-3 w-4/5 max-w-sm" />
        </div>
        <Skeleton className="h-14 w-full sm:h-[3.25rem]" />
      </div>
    </div>
  );
}

/** Category chips while API loads: same `h-9`, `gap-2`, varied widths like real labels. */
const CATEGORY_SKELETON_WIDTHS = ['w-[5.25rem]', 'w-28', 'w-24', 'w-[7.5rem]', 'w-20'] as const;

function splitFullNameForForm(fullName: string): { firstName: string; lastName: string } {
  const t = fullName.trim();
  if (!t) return { firstName: '', lastName: '' };
  const parts = t.split(/\s+/);
  return {
    firstName: (parts[0] ?? '').slice(0, MAX_FN),
    lastName: (parts.slice(1).join(' ') || '').slice(0, MAX_LN),
  };
}

function validateEmail(s: string): boolean {
  if (!s || s.length > MAX_EMAIL) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

type Props = {
  open: boolean;
  onClose: () => void;
};

function FeedbackDialog({ open, onClose }: Readonly<Props>) {
  const titleId = useId();
  const cropTitleId = useId();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthed = Boolean(token && user?.email);
  const sessionPending = Boolean(token) && isHydrated && !user?.email;

  const [categories, setCategories] = useState<FeedbackCategoryDto[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentImageTitle, setAttachmentImageTitle] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  /** At most one image: browser screen capture vs file upload (server: ClamAV + re-encode). */
  const [attachmentSource, setAttachmentSource] = useState<'none' | 'capture' | 'upload'>('none');
  const [capturing, setCapturing] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const altchaOn = Boolean(getAltchaChallengeUrl()) && !isAuthed;

  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setEmailSent(null);
    setSubject('');
    setDescription('');
    setAttachmentFile(null);
    setAttachmentImageTitle('');
    setAttachmentSource('none');
    setAttachmentPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCropDialogOpen(false);
    setCategoryId('');
    if (user) {
      const sp = user.fullName
        ? splitFullNameForForm(user.fullName)
        : { firstName: '', lastName: '' };
      setFirstName(sp.firstName);
      setLastName(sp.lastName);
      setEmail((user.email ?? '').slice(0, MAX_EMAIL));
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
    }

    let cancelled = false;
    setCategoriesLoading(true);
    void fetchFeedbackCategories()
      .then((rows) => {
        if (cancelled) return;
        setCategories(rows);
        setCategoryId(rows[0]?.id ?? '');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Could not load categories.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const clearAttachment = useCallback(() => {
    setAttachmentFile(null);
    setAttachmentImageTitle('');
    setAttachmentSource('none');
    setAttachmentPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const clearFormFields = useCallback(() => {
    setSubject('');
    setDescription('');
    setCropDialogOpen(false);
    clearAttachment();
    setCategoryId(categories[0]?.id ?? '');
    if (isAuthed && user) {
      const sp = user.fullName
        ? splitFullNameForForm(user.fullName)
        : { firstName: '', lastName: '' };
      setFirstName(sp.firstName);
      setLastName(sp.lastName);
      setEmail((user.email ?? '').slice(0, MAX_EMAIL));
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
    }
  }, [categories, clearAttachment, isAuthed, user]);

  const applyAttachment = useCallback(
    (file: File, source: 'capture' | 'upload', title?: string) => {
      setAttachmentFile(file);
      setAttachmentSource(source);
      setAttachmentImageTitle(title ?? '');
      setAttachmentPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    []
  );

  const handleCropConfirm = useCallback(
    async (file: File, meta?: { imageTitle?: string }) => {
      const v = await validateFeedbackAttachmentFile(file);
      if (!v.ok) {
        throw new Error(v.message);
      }
      applyAttachment(file, 'upload', meta?.imageTitle ?? '');
    },
    [applyAttachment]
  );

  const handleScreenCapture = useCallback(async () => {
    setCapturing(true);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      const file = await captureScreenToFeedbackFile();
      const v = await validateFeedbackAttachmentFile(file);
      if (!v.ok) {
        toast.error(v.message);
        return;
      }
      applyAttachment(file, 'capture', 'Screen capture');
    } catch (e) {
      const name =
        e && typeof e === 'object' && 'name' in e ? String((e as { name?: string }).name) : '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        toast.info('Capture cancelled.');
      } else {
        toast.error(e instanceof Error ? e.message : 'Screen capture failed.');
      }
    } finally {
      setCapturing(false);
    }
  }, [applyAttachment]);

  const fieldClass =
    'w-full border-2 border-border bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors';

  const runSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;

      if (!categoryId || categoriesLoading) {
        toast.error(categoriesLoading ? 'Loading categories…' : 'Choose a category.');
        return;
      }

      const sub = subject.trim();
      const desc = description.trim();
      const fn = firstName.trim();
      const ln = lastName.trim();
      const em = email.trim().toLowerCase();

      if (sub.length < 1 || sub.length > MAX_SUBJECT) {
        toast.error(`Subject must be 1–${MAX_SUBJECT} characters.`);
        return;
      }
      if (desc.length < MIN_DESC || desc.length > MAX_DESC) {
        toast.error(`Message must be ${MIN_DESC}–${MAX_DESC} characters.`);
        return;
      }

      let altchaPayload: string | undefined;
      if (!isAuthed) {
        if (fn.length < 1 || fn.length > MAX_FN) {
          toast.error(`First name must be 1–${MAX_FN} characters.`);
          return;
        }
        if (ln.length < 1 || ln.length > MAX_LN) {
          toast.error(`Last name must be 1–${MAX_LN} characters.`);
          return;
        }
        if (!validateEmail(em)) {
          toast.error('Enter a valid email address.');
          return;
        }
        altchaPayload = altchaOn ? readAltchaPayload(form) : undefined;
        if (altchaOn && !altchaPayload) {
          toast.error('Complete the verification check below.');
          return;
        }
      }

      if (sessionPending) {
        toast.error('Still loading your account. Try again in a moment.');
        return;
      }

      setSubmitting(true);
      try {
        const clientMeta = collectFeedbackClientMeta();
        const res = await submitFeedbackMultipart(
          {
            categoryId,
            subject: sub,
            description: desc,
            clientMeta,
            ...(isAuthed ? {} : { firstName: fn, lastName: ln, email: em, altcha: altchaPayload }),
            attachment: attachmentFile,
            attachmentTitle: attachmentImageTitle.trim() || undefined,
          },
          token
        );
        setEmailSent(Boolean(res.emailSent));
        setPhase('success');
        toast.success(res.message ?? 'Thanks for your feedback.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      altchaOn,
      attachmentFile,
      attachmentImageTitle,
      categoriesLoading,
      categoryId,
      description,
      email,
      firstName,
      isAuthed,
      lastName,
      sessionPending,
      subject,
      token,
    ]
  );

  const formFooter =
    phase === 'form' ? (
      <>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 min-h-12 shrink-0 border-2 px-5 text-xs font-black uppercase tracking-widest"
          onClick={clearFormFields}
          disabled={submitting || sessionPending || capturing}
        >
          Clear
        </Button>
        <Button
          id="fb-submit"
          type="submit"
          form={FEEDBACK_FORM_ID}
          size="lg"
          className="h-12 min-h-12 shrink-0 border-2 px-5 text-xs font-black uppercase tracking-widest"
          disabled={submitting || sessionPending || capturing || categoriesLoading || !categoryId}
        >
          {submitting ? 'Sending…' : 'Send feedback'}
        </Button>
      </>
    ) : null;

  return (
    <>
      <FormDialog
        open={open}
        onClose={onClose}
        titleId={titleId}
        title="Feedback"
        titleIcon={<MessageSquare className="size-5" strokeWidth={2.5} aria-hidden />}
        subtitle={FEEDBACK_SUBTITLE}
        subtitleClassName="min-w-0 max-w-full text-[10px] sm:text-[11px] font-medium leading-snug tracking-wide text-muted-foreground sm:line-clamp-2 normal-case"
        panelClassName={cn(
          'max-w-[min(56rem,calc(100vw-1.25rem))] sm:max-w-[56rem]',
          capturing && FEEDBACK_CAPTURE_HIDE_UI_CLASS
        )}
        backdropClassName={capturing ? FEEDBACK_CAPTURE_HIDE_UI_CLASS : undefined}
        footer={formFooter}
        footerClassName="flex flex-row flex-wrap items-center justify-end gap-2"
        interactionLock={submitting}
        interactionLockContent={submitting ? <FeedbackSuccessSubmitSkeleton /> : undefined}
      >
        {sessionPending && phase === 'form' && (
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Loading your account…
          </p>
        )}
        {phase === 'success' ? (
          <div className="space-y-6 text-center py-4">
            <CheckCircle2 className="mx-auto size-14 text-primary" strokeWidth={2} aria-hidden />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">We received your message.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {emailSent === false
                  ? 'Your feedback was saved. Email notification could not be sent automatically; our team can still read it in the dashboard.'
                  : 'Thank you for helping improve Syntax Stories.'}
              </p>
            </div>
            <Button
              type="button"
              className="w-full py-6 text-xs font-black uppercase tracking-widest"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        ) : (
          <form
            id={FEEDBACK_FORM_ID}
            onSubmit={runSubmit}
            className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:items-stretch lg:gap-x-8 lg:gap-y-6"
          >
            {/* Left: preview + capture / upload — on lg, column height matches category→subject block */}
            <aside className="order-first flex w-full max-w-[15rem] flex-col lg:col-start-1 lg:row-start-1 lg:max-w-none lg:h-full lg:min-h-0">
              <div className="flex min-h-[14rem] flex-1 flex-col border-2 border-border bg-muted/10 shadow lg:min-h-0">
                <p className="shrink-0 border-b-2 border-border bg-muted/30 px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  Attachment
                </p>
                <div className="relative min-h-[9rem] flex-1 border-b-2 border-dashed border-border/80 bg-background/50 lg:min-h-0">
                  {attachmentPreview ? (
                    <img
                      src={attachmentPreview}
                      alt={attachmentImageTitle.trim() || 'Screenshot preview'}
                      title={attachmentImageTitle.trim() || undefined}
                      className="absolute inset-0 size-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex size-full min-h-[9rem] flex-col items-center justify-center gap-1 p-3 text-center lg:min-h-0">
                      <ImagePlus
                        className="size-7 text-muted-foreground/40"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <span className="text-[8px] font-bold uppercase leading-tight tracking-wide text-muted-foreground">
                        None yet
                      </span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 space-y-1.5 p-2">
                  <p
                    id="fb-screenshot-hint"
                    className="text-[8px] leading-snug text-muted-foreground"
                  >
                    One optional image — Chrome screen share or upload. Max{' '}
                    {Math.round(FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))} MB. Server scans
                    (malware) and re-encodes.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-9 w-full border-2 px-2 text-[9px] font-black uppercase tracking-wider"
                    onClick={() => void handleScreenCapture()}
                    disabled={capturing || submitting || sessionPending}
                    aria-describedby="fb-screenshot-hint"
                  >
                    <Monitor className="mr-1.5 inline size-3.5 shrink-0 opacity-80" aria-hidden />
                    {capturing ? 'Capturing…' : 'Capture screen'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-9 w-full border-2 px-2 text-[9px] font-black uppercase tracking-wider"
                    onClick={() => setCropDialogOpen(true)}
                    disabled={capturing || submitting || sessionPending}
                    aria-describedby="fb-screenshot-hint"
                  >
                    <ImagePlus className="mr-1.5 inline size-3.5 shrink-0 opacity-80" aria-hidden />
                    Upload image
                  </Button>
                  {attachmentFile && (
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="w-full border-2 border-dashed border-border py-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                    >
                      Remove image
                    </button>
                  )}
                  {attachmentSource !== 'none' && (
                    <p className="text-center text-[7px] font-mono font-bold uppercase tracking-tighter text-primary/80">
                      {attachmentSource === 'capture' ? 'Source: capture' : 'Source: upload'}
                    </p>
                  )}
                </div>
              </div>
            </aside>

            <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1 lg:pt-0">
              <div className="space-y-2">
                <p
                  id="fb-category-label"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Category
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-labelledby="fb-category-label"
                >
                  {categoriesLoading && categories.length === 0 ? (
                    <div
                      className="flex flex-wrap gap-2"
                      aria-busy="true"
                      aria-label="Loading categories"
                    >
                      {CATEGORY_SKELETON_WIDTHS.map((w, i) => (
                        <Skeleton key={`fb-cat-skeleton-${i}`} className={cn('h-9 ', w)} />
                      ))}
                    </div>
                  ) : categories.length === 0 ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      No categories available.
                    </span>
                  ) : (
                    categories.map((c) => {
                      const selected = categoryId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={categoriesLoading}
                          onClick={() => setCategoryId(c.id)}
                          className={cn(
                            'whitespace-nowrap  border-2 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground shadow'
                              : 'border-border bg-card text-foreground hover:border-primary hover:bg-muted/40',
                            categoriesLoading && 'pointer-events-none opacity-50'
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="fb-fn"
                    className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    First name
                  </label>
                  <input
                    id="fb-fn"
                    type="text"
                    autoComplete="given-name"
                    maxLength={MAX_FN}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    readOnly={isAuthed}
                    required={!isAuthed}
                    className={cn(
                      fieldClass,
                      isAuthed && 'opacity-90 cursor-not-allowed bg-muted/40'
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="fb-ln"
                    className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    Last name
                  </label>
                  <input
                    id="fb-ln"
                    type="text"
                    autoComplete="family-name"
                    maxLength={MAX_LN}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    readOnly={isAuthed}
                    required={!isAuthed}
                    className={cn(
                      fieldClass,
                      isAuthed && 'opacity-90 cursor-not-allowed bg-muted/40'
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="fb-email"
                  className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Email
                </label>
                <input
                  id="fb-email"
                  type="email"
                  autoComplete="email"
                  maxLength={MAX_EMAIL}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={isAuthed}
                  required={!isAuthed}
                  className={cn(
                    fieldClass,
                    isAuthed && 'opacity-90 cursor-not-allowed bg-muted/40'
                  )}
                />
                {isAuthed && (
                  <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
                    Signed in — contact details match your account.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="fb-subject"
                  className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Subject
                </label>
                <input
                  id="fb-subject"
                  type="text"
                  maxLength={MAX_SUBJECT}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="min-w-0 space-y-4 lg:col-span-2 lg:row-start-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="fb-desc"
                  className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Message
                </label>
                <textarea
                  id="fb-desc"
                  rows={5}
                  maxLength={MAX_DESC}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={MIN_DESC}
                  className={cn(fieldClass, 'min-h-[120px] resize-y')}
                />
                <p className="text-[9px] text-muted-foreground">
                  {description.trim().length}/{MAX_DESC} · minimum {MIN_DESC} characters
                </p>
              </div>

              {altchaOn && (
                <div className="flex w-full flex-col gap-2">
                  <AltchaField
                    enabled
                    floating="bottom"
                    floatingAnchor="#fb-submit"
                    floatingOffset={8}
                  />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    Verification required when not signed in.
                  </p>
                </div>
              )}
            </div>
          </form>
        )}
      </FormDialog>

      <ImageUploadCropDialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        titleId={cropTitleId}
        title="Screenshot"
        titleIcon={<ImagePlus className="size-5" strokeWidth={2.5} aria-hidden />}
        subtitle={`Square crop · max ${Math.round(FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))} MB`}
        subtitleClassName="min-w-0 max-w-full text-[10px] sm:text-[11px] font-medium leading-tight tracking-wide text-muted-foreground line-clamp-1 normal-case"
        maxSizeBytes={FEEDBACK_MAX_IMAGE_BYTES}
        aspect={1}
        imageTitleField
        imageTitleLabel="Title (optional)"
        imageTitlePlaceholder="e.g. Settings page, billing section"
        confirmLabel="Attach"
        chooseAnotherLabel="Choose another"
        onConfirm={handleCropConfirm}
      />
    </>
  );
}

export function FeedbackDialogWrapper() {
  const open = useUIStore((s) => s.feedbackDialogOpen);
  const setOpen = useUIStore((s) => s.setFeedbackDialogOpen);
  return <FeedbackDialog open={open} onClose={() => setOpen(false)} />;
}
