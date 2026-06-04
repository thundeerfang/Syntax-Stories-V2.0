import { publicApiAbortSignal } from '@/lib/api/publicApiFetchTimeout';
import type { HelpHubConfig } from '@/components/help/HelpFaqSection';

export type HelpArticlePublic = {
  slug: string;
  canonicalPath: string;
  title: string;
  summary: string;
  body: string;
  bodyFormat: string;
  category: string;
  tags: string[];
  icon: string;
  sortOrder: number;
  updatedAt: string;
  publishedAt: string | null;
  redirectTo?: string;
};

export type HelpArticleListResponse = {
  data: HelpArticlePublic[];
  page: number;
  pageSize: number;
  total: number;
};

export type HelpIconFacet = {
  icon: string;
  count: number;
};

export const HELP_FAQ_PAGE_SIZE = 10;

const apiBase = () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export const DEFAULT_HELP_HUB_CONFIG: HelpHubConfig = {
  title: 'Frequently asked questions',
  description:
    "These are the most commonly asked questions about Syntax Stories. Can't find what you're looking for?",
  supportLinkLabel: 'Chat to our friendly team!',
  supportLinkHref: '/contact',
  headerIcon: 'circle-help',
  emptyTitle: 'No help articles yet',
  emptyDescription:
    'Check back soon — we are preparing answers to common questions. Need help now? Reach out to our team.',
};

export async function fetchHelpHubConfig(): Promise<HelpHubConfig> {
  const base = apiBase();
  if (!base) return DEFAULT_HELP_HUB_CONFIG;
  try {
    const res = await fetch(`${base}/api/v1/help/config`, {
      next: { revalidate: 60 },
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return DEFAULT_HELP_HUB_CONFIG;
    const json = (await res.json()) as { data?: HelpHubConfig };
    return { ...DEFAULT_HELP_HUB_CONFIG, ...json.data };
  } catch {
    return DEFAULT_HELP_HUB_CONFIG;
  }
}

function articlesQuery(params: {
  page: number;
  pageSize: number;
  q?: string;
  sort?: 'latest' | 'oldest';
}): string {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  const term = params.q?.trim();
  if (term) q.set('q', term);
  if (params.sort === 'oldest') q.set('sort', 'oldest');
  return q.toString();
}

export async function fetchPublishedHelpArticlesPage(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sort?: 'latest' | 'oldest';
  },
  opts?: { revalidate?: number | false }
): Promise<HelpArticleListResponse> {
  const empty: HelpArticleListResponse = {
    data: [],
    page: params.page ?? 1,
    pageSize: params.pageSize ?? HELP_FAQ_PAGE_SIZE,
    total: 0,
  };
  const base = apiBase();
  if (!base) return empty;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? HELP_FAQ_PAGE_SIZE;
  try {
    const query = articlesQuery({
      page,
      pageSize,
      q: params.q,
      sort: params.sort,
    });
    const revalidate = opts?.revalidate;
    const res = await fetch(`${base}/api/v1/help/articles?${query}`, {
      ...(revalidate === false ? { cache: 'no-store' as const } : { next: { revalidate: revalidate ?? 60 } }),
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as HelpArticleListResponse;
    return {
      data: json.data ?? [],
      page: json.page ?? page,
      pageSize: json.pageSize ?? pageSize,
      total: json.total ?? 0,
    };
  } catch {
    return empty;
  }
}

/** @deprecated Use fetchPublishedHelpArticlesPage for paginated lists. */
export async function fetchPublishedHelpArticles(pageSize = 50): Promise<HelpArticlePublic[]> {
  const result = await fetchPublishedHelpArticlesPage({ page: 1, pageSize });
  return result.data;
}

export async function fetchHelpIconFacets(
  opts?: { revalidate?: number | false }
): Promise<HelpIconFacet[]> {
  const base = apiBase();
  if (!base) return [];
  try {
    const revalidate = opts?.revalidate;
    const res = await fetch(`${base}/api/v1/help/facets/icons`, {
      ...(revalidate === false ? { cache: 'no-store' as const } : { next: { revalidate: revalidate ?? 120 } }),
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { icons?: HelpIconFacet[] } };
    return json.data?.icons ?? [];
  } catch {
    return [];
  }
}

export async function fetchPublishedArticleBySlug(slug: string): Promise<HelpArticlePublic | null> {
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
