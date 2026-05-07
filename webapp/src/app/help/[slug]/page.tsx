import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

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
  const res = await fetch(`${base}/api/v1/help/articles/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { success?: boolean; data?: ApiArticle };
  return json.data ?? null;
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchArticle(slug);
  if (!data) notFound();
  if (data.redirectTo) {
    redirect(data.redirectTo);
  }
  if (data.canonicalPath.startsWith('/docs/')) {
    redirect(data.canonicalPath);
  }
  return (
    <div className="mx-auto max-w-prose space-y-4 px-4 py-10">
      <Link href="/help" className="text-sm text-muted-foreground underline">
        ← Help
      </Link>
      <h1 className="text-3xl font-black tracking-tight">{data.title}</h1>
      {data.summary ? (
        <p className="text-muted-foreground">{data.summary}</p>
      ) : null}
      <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
        {data.body}
      </div>
    </div>
  );
}
