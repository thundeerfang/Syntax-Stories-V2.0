'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { toast } from 'sonner';
import { blogApi } from '@/api/blog';
import { FeaturedCategoryCard } from '@/features/explore';
import { RailFeedEmptyState, ShellPageIntroHeader } from '@/components/layout';
import { BlogApiConnectionError } from '@/lib/api/blogAuthFetch';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import type { BlogTaxonomyRow } from '@/types/blog';

function toastApiError(e: unknown, fallback: string) {
  if (e instanceof BlogApiConnectionError) {
    toast.error(e.message);
    return;
  }
  toast.error(e instanceof Error && e.message ? e.message : fallback);
}

/** Browse blog taxonomy categories (`GET /api/blog/taxonomy`). */
export default function CategoriesPage() {
  const [categories, setCategories] = useState<BlogTaxonomyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const tax = await blogApi.getTaxonomy();
      setCategories(tax.categories ?? []);
    } catch (e) {
      setCategories([]);
      const msg = e instanceof Error ? e.message : 'Could not load categories.';
      setErrorMsg(msg);
      toastApiError(e, 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name)),
    [categories]
  );

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'py-8 sm:py-10')}>
      <ShellPageIntroHeader
        breadcrumbItems={[
          { label: 'Home', href: '/' },
          { label: 'Categories', href: '/categories' },
        ]}
        title={
          <h1 className="font-mono text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            <Layers
              className="mr-2 inline-block size-7 text-primary sm:size-8"
              strokeWidth={2.25}
              aria-hidden
            />
            Categories
          </h1>
        }
        description="Browse published stories by taxonomy category. Counts reflect live posts on the platform."
        descriptionEnd={
          <Link
            href="/topics"
            className="inline-flex border-2 border-border bg-card px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-foreground shadow transition-transform hover:-translate-y-0.5 active:translate-x-px active:translate-y-px active:shadow-none"
          >
            All topics
          </Link>
        }
      />

      {loading ? (
        <div
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="h-48 animate-pulse border-2 border-border bg-muted/40" />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="mt-10 border-2 border-destructive bg-destructive/10 px-4 py-6 text-center">
          <p className="text-sm font-medium text-destructive">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 border-2 border-border bg-card px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest shadow hover:bg-muted/50"
          >
            Retry
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <RailFeedEmptyState
          icon={Layers}
          className="mt-10"
          title="No categories in taxonomy yet"
          description="When staff publish taxonomy categories and writers file stories under them, they will show up here."
          actions={[{ label: 'All topics', href: '/topics', variant: 'primary' }]}
        />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => (
            <FeaturedCategoryCard
              key={c.slug}
              slug={c.slug}
              name={c.name}
              description={
                c.description?.trim()
                  ? c.description.trim()
                  : `Writers filing stories under ${c.name}.`
              }
              postCount={c.postCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
