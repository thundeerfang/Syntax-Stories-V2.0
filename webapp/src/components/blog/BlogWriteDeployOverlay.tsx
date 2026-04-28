'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderTree, ImageIcon, Languages, Rocket, Tags, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlogTaxonomyRow } from '@/types/blog';
import {
  BLOG_PUBLISH_LANGUAGE_OPTIONS,
  blogPublishSummaryPreviewPlain,
  type BlogPublishTaxonomy,
} from '@/lib/blogPublishTaxonomy';

export interface BlogWriteDeployOverlayProps {
  open: boolean;
  onClose: () => void;
  snapshot: BlogPublishTaxonomy;
  taxonomyCategories: BlogTaxonomyRow[];
  taxonomyTags: BlogTaxonomyRow[];
  title: string;
  summaryHtml: string;
  thumbnailPreviewUrl: string | null;
  deploying: boolean;
  savingClassification: boolean;
  onSaveClassification: (tax: BlogPublishTaxonomy) => void;
  onDeploy: (tax: BlogPublishTaxonomy) => void;
}

const fieldClass =
  'w-full rounded-xl border border-border/80 bg-muted/25 px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20';

export function BlogWriteDeployOverlay({
  open,
  onClose,
  snapshot,
  taxonomyCategories,
  taxonomyTags,
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
  const [language, setLanguage] = useState(snapshot.language || 'en');

  useEffect(() => {
    if (!open) return;
    setCategory(snapshot.category);
    setTags([...snapshot.tags]);
    setLanguage(snapshot.language || 'en');
    setTagInput('');
  }, [open, snapshot.category, snapshot.tags, snapshot.language]);

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
      language: (language || 'en').toLowerCase().replaceAll(/[^a-z-]/g, '').slice(0, 12) || 'en',
    }),
    [category, tags, language],
  );

  const handleDeploy = () => {
    const tax = buildTax();
    onDeploy({ ...tax, category: tax.category || '' });
  };

  const handleSaveClassification = () => {
    const tax = buildTax();
    onSaveClassification({ ...tax, category: tax.category || '' });
  };

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="blog-write-deploy-overlay"
          role="presentation"
          className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            disabled={busy}
            className="absolute inset-0 bg-zinc-950/55 backdrop-blur-md dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onClose()}
          />

          <motion.article
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-deploy-overlay-title"
            className={cn(
              'relative z-[201] flex w-full max-w-2xl flex-col overflow-hidden',
              'rounded-t-[1.75rem] border border-border/60 bg-background/95 shadow-[0_-24px_80px_-20px_rgba(0,0,0,0.18)]',
              'backdrop-blur-2xl dark:border-white/10 dark:bg-gradient-to-b dark:from-zinc-900/95 dark:via-zinc-950/98 dark:to-zinc-950',
              'dark:shadow-[0_-24px_80px_-20px_rgba(0,0,0,0.45)] dark:ring-1 dark:ring-white/[0.06]',
              'sm:max-h-[min(92vh,860px)] sm:rounded-[1.75rem] sm:shadow-2xl sm:dark:ring-0',
            )}
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.85 }}
          >
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-600/15"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl dark:bg-fuchsia-600/10"
              aria-hidden
            />

            <header className="relative flex items-start justify-between gap-4 border-b border-border/60 px-6 pb-4 pt-6 dark:border-white/5 sm:px-8 sm:pt-8">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Review and publish
                </p>
                <h2
                  id="blog-deploy-overlay-title"
                  className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]"
                >
                  {displayTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !busy && onClose()}
                disabled={busy}
                className="rounded-full border border-border/60 bg-muted/40 p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div className="relative max-h-[min(60vh,560px)] flex-1 overflow-y-auto px-6 py-5 sm:max-h-[min(72vh,720px)] sm:px-8 sm:py-6 [scrollbar-width:thin]">
              <section className="overflow-hidden rounded-2xl border border-border/50 bg-muted/15 dark:bg-zinc-900/40">
                <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:px-5">
                  <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
                  Preview
                </div>
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                  <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted sm:h-32 sm:w-44">
                    {thumbnailPreviewUrl ? (
                      <img src={thumbnailPreviewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full min-h-[7rem] items-center justify-center px-3 text-center text-xs text-muted-foreground">
                        No cover yet
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{displayTitle}</p>
                    {summaryLine ? (
                      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{summaryLine}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">No summary</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                  <div className="min-w-0 sm:col-span-1">
                    <label
                      htmlFor="blog-deploy-category"
                      className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground"
                    >
                      <FolderTree className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                      Category
                    </label>
                    <select
                      id="blog-deploy-category"
                      value={category || ''}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={busy}
                      className={cn(fieldClass, 'disabled:opacity-50')}
                    >
                      <option value="">— None —</option>
                      {categoryOptions.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                          {c.postCount > 0 ? ` (${c.postCount})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 sm:col-span-1">
                    <label
                      htmlFor="blog-deploy-lang"
                      className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground"
                    >
                      <Languages className="h-4 w-4 shrink-0 text-sky-500" aria-hidden />
                      Language
                    </label>
                    <select
                      id="blog-deploy-lang"
                      value={BLOG_PUBLISH_LANGUAGE_OPTIONS.some((o) => o.value === language) ? language : 'en'}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={busy}
                      className={cn(fieldClass, 'disabled:opacity-50')}
                    >
                      {BLOG_PUBLISH_LANGUAGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.value})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 sm:col-span-2">
                    <label
                      htmlFor="blog-deploy-tags-input"
                      className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground"
                    >
                      <Tags className="h-4 w-4 shrink-0 text-fuchsia-500" aria-hidden />
                      Tags
                      <span className="text-[10px] font-normal text-muted-foreground">(max 20)</span>
                    </label>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          disabled={busy}
                          onClick={() => removeTag(t)}
                          className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-mono text-primary transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
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
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addTag(tagInput)}
                        className="shrink-0 rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                    {taxonomyTags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="w-full text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Suggested
                        </span>
                        {taxonomyTags.slice(0, 28).map((t) => (
                          <button
                            key={t.slug}
                            type="button"
                            disabled={tags.includes(t.slug) || tags.length >= 20 || busy}
                            onClick={() => addTag(t.slug)}
                            className="rounded-lg border border-border/70 bg-muted/20 px-2 py-1 text-[11px] font-mono text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-40"
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

            <footer className="relative space-y-3 border-t border-border/60 bg-muted/15 px-6 py-5 dark:border-white/5 dark:bg-zinc-950/30 sm:px-8 sm:py-6">
              <button
                type="button"
                disabled={busy}
                onClick={handleDeploy}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white',
                  'bg-gradient-to-r from-violet-600 via-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/25',
                  'transition hover:brightness-105 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                <Rocket className="h-5 w-5 shrink-0" aria-hidden />
                {deploying ? 'Publishing…' : 'Deploy blog'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSaveClassification}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/80 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/60 disabled:opacity-50"
              >
                {savingClassification ? 'Saving…' : 'Save classification to draft'}
              </button>
            </footer>
          </motion.article>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
