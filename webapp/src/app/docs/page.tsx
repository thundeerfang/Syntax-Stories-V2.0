import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchPublishedHelpList, HELP_CATEGORY_DOCUMENTATION } from '@/lib/api/publicHelp';


export const metadata: Metadata = {
  title: 'Documentation — Syntax Stories',
  description: 'Product documentation and guides for Syntax Stories.',
};

export default async function DocsHomePage() {
  const articles = await fetchPublishedHelpList({
    category: HELP_CATEGORY_DOCUMENTATION,
    pageSize: 80,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Documentation</h1>
        <p className="text-sm text-muted-foreground">
          Guides and reference material for using Syntax Stories. Articles with category{' '}
          <code className="border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">documentation</code>{' '}
          in the CMS appear here and in the sidebar.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Published topics</h2>
        {articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documentation articles yet. Staff can publish articles with category &quot;documentation&quot; from the
            admin help CMS — they will list here automatically.
          </p>
        ) : (
          <ul className="space-y-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={a.canonicalPath.startsWith('/docs') ? a.canonicalPath : `/docs/${a.slug}`}
                  className="group flex flex-col border-2 border-border bg-card p-4 shadow hover:border-foreground/20 hover:bg-muted/30"
                >
                  <span className="text-sm font-black uppercase tracking-tight text-foreground group-hover:text-primary">
                    {a.title}
                  </span>
                  {a.summary ? (
                    <span className="mt-1 text-xs text-muted-foreground">{a.summary}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ss-empty-dashed-panel p-4">
        <h2 className="text-[11px] font-black uppercase text-muted-foreground">Need account help?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visit the{' '}
          <Link href="/help" className="font-bold text-primary underline">
            help center
          </Link>{' '}
          for troubleshooting, sign-in issues, and FAQs.
        </p>
      </section>
    </div>
  );
}
