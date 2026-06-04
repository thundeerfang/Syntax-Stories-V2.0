'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { DocsLayoutProvider, type DocsNavArticle } from './DocsLayoutContext';
import { DocsNavbar } from './DocsNavbar';
import { DocsSidebar } from './DocsSidebar';
import { DocsTocRail } from './DocsTocRail';
import { docsContentPaddingX } from './docsContentPadding';

type DocsAppLayoutProps = {
  articles: DocsNavArticle[];
  siteName: string;
  children: ReactNode;
};

/** Left nav · center content · right TOC rail (when headings exist). */
export function DocsAppLayout({ articles, siteName, children }: DocsAppLayoutProps) {
  return (
    <DocsLayoutProvider articles={articles} siteName={siteName}>
      <div className="flex h-screen overflow-hidden bg-background">
        <DocsSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DocsNavbar />
          <div className="flex min-h-0 flex-1">
            <main
              className={cn(
                'min-h-0 min-w-0 flex-1 overflow-y-auto py-4 sm:py-5',
                docsContentPaddingX
              )}
            >
              {children}
            </main>
            <DocsTocRail />
          </div>
        </div>
      </div>
    </DocsLayoutProvider>
  );
}
