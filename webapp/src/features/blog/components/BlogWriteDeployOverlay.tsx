'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FolderTree,
  ImageIcon,
  Rocket,
  Tags,
  UsersRound,
} from 'lucide-react';
import { FormDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect, type SearchableSelectOption } from '@/components/retroui';
import { cn } from '@/lib/core/utils';
import type { BlogTaxonomyRow } from '@/types/blog';
import { blogPublishSummaryPreviewPlain, type BlogPublishTaxonomy } from '@/lib/blog/blogPublishTaxonomy';


export type BlogWriteDeploySquadOption = Readonly<{
  _id: string;
  name: string;
  slug: string;
}>;

export interface BlogWriteDeployOverlayProps {
  open: boolean;
  onClose: () => void;
  snapshot: BlogPublishTaxonomy;
  taxonomyCategories: BlogTaxonomyRow[];
  taxonomyTags: BlogTaxonomyRow[];
  /** Squads the signed-in user belongs to; optional squad attachment for this post. */
  mySquads?: readonly BlogWriteDeploySquadOption[];
  /** Seed when the overlay opens (e.g. from `?squad=`). */
  initialSquadMongoId?: string | null;
  title: string;
  summaryHtml: string;
  thumbnailPreviewUrl: string | null;
  deploying: boolean;
  savingClassification: boolean;
  onSaveClassification: (tax: BlogPublishTaxonomy, squadMongoId: string | null) => void;
  onDeploy: (tax: BlogPublishTaxonomy, squadMongoId: string | null) => void;
}

const fieldClass =
  'w-full border-2 border-border bg-card px-3 py-2 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none disabled:opacity-50';

export function BlogWriteDeployOverlay({
  open,
  onClose,
  snapshot,
  taxonomyCategories,
  taxonomyTags,
  mySquads = [],
  initialSquadMongoId = null,
  title,
  summaryHtml,
  thumbnailPreviewUrl,
  deploying,
  savingClassification,
  onSaveClassification,
  onDeploy,
}: Readonly<BlogWriteDeployOverlayProps>) {
  const busy = deploying || savingClassification;
  const [category, setCategory] = useState(snapshot.category);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(snapshot.tags);
  const [squadMongoId, setSquadMongoId] = useState<string | null>(initialSquadMongoId ?? null);

  useEffect(() => {
    if (!open) return;
    setCategory(snapshot.category);
    setTags([...snapshot.tags]);
    setTagInput('');
    const allowed = new Set(mySquads.map((s) => s._id));
    const seed =
      initialSquadMongoId && allowed.has(initialSquadMongoId) ? initialSquadMongoId : null;
    setSquadMongoId(seed);
  }, [open, snapshot.category, snapshot.tags, initialSquadMongoId, mySquads]);

  const summaryLine = useMemo(() => blogPublishSummaryPreviewPlain(summaryHtml), [summaryHtml]);
  const displayTitle = title.trim() || 'Untitled';

  const categoryOptions = useMemo(() => {
    const slugs = new Set(taxonomyCategories.map((c) => c.slug.toLowerCase()));
    const c = category.trim().toLowerCase();
    if (c && !slugs.has(c)) {
      return [...taxonomyCategories, { slug: c, name: c, postCount: 0 }];
    }
    return taxonomyCategories;
  }, [taxonomyCategories, category]);

  const addTag = useCallback((raw: string) => {
    const t = raw.trim().toLowerCase().replaceAll(/\s+/g, '-').replaceAll(/[^\w-]/g, '').slice(0, 32);
    if (!t) return;
    setTags((prev) => (prev.includes(t) || prev.length >= 20 ? prev : [...prev, t]));
    setTagInput('');
  }, []);

  const removeTag = useCallback((t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  }, []);

  const buildTax = useCallback(
    (): BlogPublishTaxonomy => ({
      category: category.trim().toLowerCase().replaceAll(/\s+/g, '-').replaceAll(/[^\w-]/g, '').slice(0, 48),
      tags,
      language: 'en',
    }),
    [category, tags],
  );

  const handleDeploy = () => {
    const tax = buildTax();
    onDeploy({ ...tax, category: tax.category || '' }, squadMongoId);
  };

  const handleSaveClassification = () => {
    const tax = buildTax();
    onSaveClassification({ ...tax, category: tax.category || '' }, squadMongoId);
  };

  const squadSelectValue = useMemo(() => {
    const allowed = new Set(mySquads.map((s) => s._id));
    if (squadMongoId && allowed.has(squadMongoId)) return squadMongoId;
    return '';
  }, [mySquads, squadMongoId]);

  const categorySelectOptions = useMemo((): SearchableSelectOption[] => {
    return [
      { value: '', label: '— None —' },
      ...categoryOptions.map((c) => ({
        value: c.slug,
        label: c.postCount > 0 ? `${c.name} (${c.postCount})` : c.name,
      })),
    ];
  }, [categoryOptions]);

  const squadSelectOptions = useMemo((): SearchableSelectOption[] => {
    return [
      { value: '', label: '— Not attached to a squad —' },
      ...mySquads.map((s) => ({ value: s._id, label: s.name })),
    ];
  }, [mySquads]);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Review and publish"
      titleId="blog-deploy-overlay-title"
      titleIcon={<Rocket className="h-5 w-5 text-primary" strokeWidth={2.5} aria-hidden />}
      subtitle={displayTitle}
      subtitleClassName="line-clamp-2 min-w-0"
      panelClassName="max-w-2xl"
      interactionLock={busy}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            loading={savingClassification}
            onClick={handleSaveClassification}
            className="w-full sm:w-auto"
          >
            Save classification to draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            loading={deploying}
            onClick={handleDeploy}
            className="w-full sm:w-auto"
          >
            <Rocket className="size-4 shrink-0" aria-hidden />
            Deploy blog
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <section className="overflow-hidden border-2 border-border bg-card shadow">
          <div className="flex items-center gap-2 border-b-2 border-border bg-muted/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <ImageIcon className="size-4 shrink-0 text-primary" aria-hidden />
            Preview
          </div>
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
            <div className="h-28 w-full shrink-0 overflow-hidden border-2 border-border bg-muted sm:h-32 sm:w-44">
              {thumbnailPreviewUrl ? (
                <img src={thumbnailPreviewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[7rem] items-center justify-center px-3 text-center text-xs text-muted-foreground">
                  No cover yet
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{displayTitle}</p>
              {summaryLine ? (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{summaryLine}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">No summary</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
            <div className="min-w-0 sm:col-span-1">
              <label
                htmlFor="blog-deploy-category"
                className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-foreground"
              >
                <FolderTree className="size-4 shrink-0 text-primary" aria-hidden />
                Category
              </label>
              <SearchableSelect
                id="blog-deploy-category"
                label=""
                placeholder="Select category"
                value={category || ''}
                onChange={setCategory}
                options={categorySelectOptions}
                disabled={busy}
                listMaxHeight={240}
                widthClass="w-full"
                className="gap-0 [&>label]:hidden"
              />
            </div>

            {mySquads.length > 0 ? (
              <div className="min-w-0 sm:col-span-2">
                <label
                  htmlFor="blog-deploy-squad"
                  className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-foreground"
                >
                  <UsersRound className="size-4 shrink-0 text-primary" aria-hidden />
                  Squad
                  <span className="font-mono text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <SearchableSelect
                  id="blog-deploy-squad"
                  label=""
                  placeholder="Select squad (optional)"
                  value={squadSelectValue}
                  onChange={(v) => setSquadMongoId(v ? v : null)}
                  options={squadSelectOptions}
                  disabled={busy}
                  searchable={mySquads.length > 6}
                  listMaxHeight={220}
                  widthClass="w-full"
                  className="gap-0 [&>label]:hidden"
                />
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  Publish or save this draft as a squad post for the feed you pick. Leave unset for a personal post
                  only.
                </p>
              </div>
            ) : null}

            <div className="min-w-0 sm:col-span-2">
              <label
                htmlFor="blog-deploy-tags-input"
                className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-foreground"
              >
                <Tags className="size-4 shrink-0 text-primary" aria-hidden />
                Tags
                <span className="font-mono text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                  (max 20)
                </span>
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={busy}
                    onClick={() => removeTag(t)}
                    className="border-2 border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary shadow transition hover:border-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  id="blog-deploy-tags-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder="Type a tag, press Enter"
                  className={cn(fieldClass, 'min-w-0 flex-1')}
                />
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => addTag(tagInput)}>
                  Add
                </Button>
              </div>
              {taxonomyTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="w-full font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Suggested
                  </span>
                  {taxonomyTags.slice(0, 28).map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      disabled={tags.includes(t.slug) || tags.length >= 20 || busy}
                      onClick={() => addTag(t.slug)}
                      className="border-2 border-border bg-muted/30 px-2 py-1 font-mono text-[11px] text-muted-foreground shadow transition hover:border-primary hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                    >
                      +{t.name}
                      {t.postCount > 0 ? ` · ${t.postCount}` : ''}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </FormDialog>
  );
}
