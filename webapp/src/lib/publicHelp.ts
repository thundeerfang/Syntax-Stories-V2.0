import { publicApiAbortSignal } from '@/lib/publicApiFetchTimeout';

/** Matches server `helpArticle.category` for product docs (see help.mappers `helpCanonicalPath`). */
export const HELP_CATEGORY_DOCUMENTATION = 'documentation';

const apiBase = () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export type HelpArticlePublic = {
  slug: string;
  canonicalPath: string;
  title: string;
  summary: string;
  body: string;
  bodyFormat: string;
  category: string;
  tags: string[];
  updatedAt: string;
  publishedAt: string | null;
  redirectTo?: string;
};

export async function fetchPublishedHelpList(opts?: {
  category?: string;
  pageSize?: number;
}): Promise<HelpArticlePublic[]> {
  const base = apiBase();
  if (!base) return [];
  const pageSize = opts?.pageSize ?? 50;
  const cat = opts?.category;
  const q = new URLSearchParams({ page: '1', pageSize: String(pageSize) });
  if (cat) q.set('category', cat);
  try {
    const res = await fetch(`${base}/api/v1/help/articles?${q.toString()}`, {
      next: { revalidate: 60 },
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: HelpArticlePublic[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchPublishedArticleBySlug(
  slug: string
): Promise<HelpArticlePublic | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v1/help/articles/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: HelpArticlePublic };
    return json.data ?? null;
  } catch {
    return null;
  }
}
