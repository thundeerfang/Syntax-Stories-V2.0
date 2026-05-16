import { Terminal } from 'lucide-react';
import Link from 'next/link';
import { fetchPublishedHelpList, HELP_CATEGORY_DOCUMENTATION } from '@/lib/api/publicHelp';
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb';
import { DocsSidebarNav } from '@/components/docs/DocsSidebarNav';


const MIN_BELOW_HEADER = 'min-h-[calc(100vh-var(--header-height))]';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const articles = await fetchPublishedHelpList({
    category: HELP_CATEGORY_DOCUMENTATION,
    pageSize: 80,
  });

  const navArticles = articles.map((a) => ({
    slug: a.slug,
    title: a.title,
    canonicalPath: a.canonicalPath,
  }));

  return (
    <div className={`flex w-full flex-col ${MIN_BELOW_HEADER}`}>
      {/* Single retro frame: same 4px border on all sides + block shadow (globals @theme --shadow) */}
      <div
        className={`mx-auto flex w-full max-w-[1440px] flex-1 flex-col ${MIN_BELOW_HEADER} border-4 border-border bg-card shadow`}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="sticky top-0 z-[1] hidden h-[calc(100vh-var(--header-height))] w-72 shrink-0 flex-col border-border bg-card/50 lg:flex lg:border-r-4">
            <DocsSidebarNav articles={navArticles} />
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="border-b-4 border-border bg-muted/20 lg:hidden">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <Terminal size={18} className="text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest">Browse topics</span>
                  </div>
                  <span className="border-2 border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow group-open:bg-muted">
                    Menu
                  </span>
                </summary>
                <div className="border-t-4 border-border bg-card p-6">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    <li>
                      <Link
                        href="/docs"
                        className="block border-2 border-border bg-muted/20 p-3 text-[10px] font-bold uppercase shadow hover:bg-muted"
                      >
                        Overview
                      </Link>
                    </li>
                    {articles.map((a) => {
                      const href = a.canonicalPath.startsWith('/docs') ? a.canonicalPath : `/docs/${a.slug}`;
                      return (
                        <li key={a.slug}>
                          <Link
                            href={href}
                            className="block border-2 border-border bg-card p-3 text-[10px] font-bold uppercase text-muted-foreground shadow hover:bg-muted hover:text-foreground"
                          >
                            {a.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-6 border-t-4 border-dashed border-border pt-4">
                    <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Need assistance?
                    </p>
                    <Link
                      href="/help"
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-primary underline-offset-4 hover:underline"
                    >
                      Help center
                    </Link>
                  </div>
                </div>
              </details>
            </div>

            <div className="flex h-12 shrink-0 items-center border-b-4 border-border bg-muted/15 px-4 sm:px-8">
              <DocsBreadcrumb articles={navArticles} />
            </div>

            <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-10 lg:py-14">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
