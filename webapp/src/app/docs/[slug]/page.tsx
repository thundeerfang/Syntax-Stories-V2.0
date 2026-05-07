import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPublishedArticleBySlug } from '@/lib/publicHelp';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublishedArticleBySlug(slug);
  if (!data) return { title: 'Documentation' };
  return {
    title: `${data.title} — Documentation`,
    description: data.summary || undefined,
    alternates: data.canonicalPath
      ? { canonical: data.canonicalPath }
      : { canonical: `/docs/${data.slug}` },
  };
}

export default async function DocsArticlePage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchPublishedArticleBySlug(slug);
  if (!data) notFound();
  if (data.redirectTo) {
    redirect(data.redirectTo);
  }

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <header className="space-y-2 border-b-2 border-border pb-6">
        <h1 className="text-3xl font-black tracking-tight text-foreground">{data.title}</h1>
        {data.summary ? <p className="text-muted-foreground">{data.summary}</p> : null}
      </header>
      <div className="prose prose-neutral max-w-none whitespace-pre-wrap dark:prose-invert">{data.body}</div>
    </div>
  );
}
