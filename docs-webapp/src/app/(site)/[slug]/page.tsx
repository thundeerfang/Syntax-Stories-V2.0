import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsMarkdown } from '@/components/DocsMarkdown';
import { DocsArticleCallout } from '@/components/layout/DocsArticleCallout';
import { DocsTocSync } from '@/components/layout/DocsTocSync';
import { fetchPublishedArticleBySlug } from '@/lib/api/publicHelp';
import { parseMarkdownHeadings } from '@/lib/markdown/parseMarkdownHeadings';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublishedArticleBySlug(slug);
  if (!data) return { title: 'Not found' };
  return {
    title: data.title,
    description: data.summary || undefined,
  };
}

function formatUpdatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function DocsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchPublishedArticleBySlug(slug);

  if (!article) notFound();
  if (article.redirectTo) redirect(article.redirectTo);

  const tableOfContents = parseMarkdownHeadings(article.body);

  return (
    <>
      <DocsTocSync entries={tableOfContents} />
      <article className="w-full max-w-none">
        <header className="mb-8 space-y-3 border-b-2 border-border pb-6">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{article.title}</h1>
          {article.summary ? (
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">{article.summary}</p>
          ) : null}
          {article.updatedAt ? (
            <p className="text-sm text-muted-foreground">
              Last updated {formatUpdatedDate(article.updatedAt)}
            </p>
          ) : null}
        </header>

        <DocsArticleCallout title={article.title} />

        <DocsMarkdown content={article.body} />
      </article>
    </>
  );
}
