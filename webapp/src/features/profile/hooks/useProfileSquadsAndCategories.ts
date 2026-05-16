'use client';

import { useCallback, useEffect, useState } from 'react';
import { blogApi } from '@/api/blog';
import { squadsApi, type SquadSummary } from '@/api/squads';
import {
  FOLLOWED_CATEGORIES_CHANGED_EVENT,
  readFollowedCategorySlugs,
} from '@/lib/feeds/followedCategoriesStorage';
import type { BlogTaxonomyRow } from '@/types/blog';

export type FollowedCategoryRow = { slug: string; name: string; postCount: number };

export function useProfileSquadsAndCategories(opts: Readonly<{
  username: string | null;
  userId: string | null;
  token: string | null;
  isSelf: boolean;
  enabled?: boolean;
}>) {
  const { username, userId, token, isSelf, enabled = true } = opts;
  const [squads, setSquads] = useState<SquadSummary[]>([]);
  const [categories, setCategories] = useState<FollowedCategoryRow[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const refreshSquads = useCallback(async () => {
    if (!enabled || !username?.trim()) {
      setSquads([]);
      return;
    }
    setLoadingSquads(true);
    try {
      if (isSelf && token) {
        const r = await squadsApi.listMine(token);
        setSquads(r.squads);
      } else {
        const r = await squadsApi.listForUser(username, token);
        setSquads(r.squads);
      }
    } catch {
      setSquads([]);
    } finally {
      setLoadingSquads(false);
    }
  }, [enabled, username, isSelf, token]);

  const refreshCategories = useCallback(async () => {
    if (!enabled || !isSelf || !userId?.trim()) {
      setCategories([]);
      return;
    }
    setLoadingCategories(true);
    try {
      const slugs = readFollowedCategorySlugs(userId);
      if (!slugs.length) {
        setCategories([]);
        return;
      }
      const tax = await blogApi.getTaxonomy();
      const bySlug = new Map(
        (tax.categories ?? []).map((c: BlogTaxonomyRow) => [c.slug.toLowerCase(), c] as const),
      );
      const rows: FollowedCategoryRow[] = slugs
        .map((slug) => {
          const row = bySlug.get(slug);
          return row
            ? { slug: row.slug, name: row.name, postCount: row.postCount }
            : { slug, name: slug, postCount: 0 };
        })
        .filter(Boolean);
      setCategories(rows);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [enabled, isSelf, userId]);

  useEffect(() => {
    void refreshSquads();
  }, [refreshSquads]);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    if (!isSelf || !userId?.trim()) return;
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string | null }>).detail;
      if (detail?.userId != null && detail.userId !== userId.trim()) return;
      void refreshCategories();
    };
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
  }, [isSelf, userId, refreshCategories]);

  return {
    squads,
    categories,
    squadCount: squads.length,
    categoryCount: categories.length,
    loadingSquads,
    loadingCategories,
    refreshSquads,
    refreshCategories,
    showCategories: isSelf,
  };
}
