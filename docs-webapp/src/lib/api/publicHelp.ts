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

export type HelpListEnvelope = {
  success?: boolean;
  version?: string;
  listPipelineVersion?: string;
  data?: HelpArticlePublic[];
  total?: number;
};

export async function fetchPublishedHelpList(opts?: {
  category?: string;
  pageSize?: number;
}): Promise<{ articles: HelpArticlePublic[]; total: number }> {
  const base = apiBase();
  if (!base) return { articles: [], total: 0 };

  const pageSize = opts?.pageSize ?? 50;
  const q = new URLSearchParams({ page: '1', pageSize: String(pageSize) });
  if (opts?.category) q.set('category', opts.category);

  try {
    const res = await fetch(`${base}/api/v1/help/articles?${q.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { articles: [], total: 0 };
    const json = (await res.json()) as HelpListEnvelope;
    const articles = json.data ?? [];
    return { articles, total: json.total ?? articles.length };
  } catch {
    return { articles: [], total: 0 };
  }
}

export async function fetchPublishedArticleBySlug(slug: string): Promise<HelpArticlePublic | null> {
  const base = apiBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/api/v1/help/articles/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: HelpArticlePublic };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string {
  return apiBase();
}

export async function probePublicHelpApi(): Promise<{
  ok: boolean;
  message: string;
  total?: number;
  version?: string;
}> {
  const base = apiBase();
  if (!base) {
    return { ok: false, message: 'NEXT_PUBLIC_API_BASE_URL is not set' };
  }
  try {
    const res = await fetch(
      `${base}/api/v1/help/articles?category=${HELP_CATEGORY_DOCUMENTATION}&pageSize=1`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as HelpListEnvelope;
    return {
      ok: true,
      message: 'Public Help API reachable',
      total: json.total,
      version: json.version,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Unreachable',
    };
  }
}
