import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { publicApiAbortSignal } from '@/lib/api/publicApiFetchTimeout';


type ApiArticle = {
  slug: string;
  canonicalPath: string;
  title: string;
  summary: string;
  body: string;
  bodyFormat: string;
  category?: string;
  redirectTo?: string;
};

async function fetchArticle(slug: string): Promise<ApiArticle | null> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v1/help/articles/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: ApiArticle };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) {
    notFound();
  } else {
    if (article.redirectTo) {
      redirect(article.redirectTo);
    }
    if (article.canonicalPath.startsWith('/docs/')) {
      redirect(article.canonicalPath);
    }
    return (
      <div className="mx-auto max-w-prose space-y-4 px-4 py-10">
        <Link href="/help" className="text-sm text-muted-foreground underline">
          ← Help
        </Link>
        <h1 className="text-3xl font-black tracking-tight">{article.title}</h1>
        {article.summary ? (
          <p className="text-muted-foreground">{article.summary}</p>
        ) : null}
        <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
          {article.body}
        </div>
      </div>
    );
  }
}
