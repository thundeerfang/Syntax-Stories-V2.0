import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, FileText } from 'lucide-react';
import {
  fetchPublishedHelpList,
  getApiBaseUrl,
  HELP_CATEGORY_DOCUMENTATION,
} from '@/lib/api/publicHelp';
import { articleHref } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Overview',
};

export default async function DocsHomePage() {
  const { articles, total } = await fetchPublishedHelpList({
    category: HELP_CATEGORY_DOCUMENTATION,
    pageSize: 80,
  });

  const apiConfigured = Boolean(getApiBaseUrl());

  return (
    <div className="w-full space-y-10">
      <header className="space-y-3 border-b-2 border-border pb-8">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Documentation
        </p>
        <h1 className="text-4xl font-black tracking-tight">Syntax Stories Docs</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          CMS-backed product documentation. Articles published with category{' '}
          <code className="border border-border bg-muted px-1.5 py-0.5 font-mono text-sm">documentation</code>{' '}
          appear here automatically from the Help API.
        </p>
      </header>

      {!apiConfigured ? (
        <div className="border-2 border-amber-600 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 shadow dark:text-amber-100">
          Set <code className="font-mono">NEXT_PUBLIC_API_BASE_URL</code> in{' '}
          <code className="font-mono">.env.local</code> (see <code className="font-mono">.env.example</code>).
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 border-b-2 border-border pb-3">
          <h2 className="text-lg font-black tracking-tight">Published topics</h2>
          <span className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {total} article(s)
          </span>
        </div>

        {articles.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-muted/30 p-10 text-center shadow">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No documentation articles yet. Product docs are managed separately from Help CMS.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={articleHref(a)}
                  className="group flex h-full flex-col border-2 border-border bg-card p-5 shadow transition-all hover:border-primary/40 hover:bg-primary/5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <span className="font-bold group-hover:text-primary">{a.title}</span>
                  {a.summary ? (
                    <span className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.summary}</span>
                  ) : null}
                  <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] font-black uppercase tracking-wide text-primary">
                    Read
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
