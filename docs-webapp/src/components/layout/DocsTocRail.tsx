'use client';

import { cn } from '@/lib/utils/cn';
import { useActiveHeading } from '@/lib/hooks/useActiveHeading';
import { RETRO_LABEL, RETRO_TOC_LINK, RETRO_TOC_LINK_ACTIVE } from '@/lib/retroUi';
import { useDocsLayout } from './DocsLayoutContext';
import { DocsShareButtons } from './DocsShareButtons';

/** Fixed right rail — share actions + table of contents. */
export function DocsTocRail() {
  const { tableOfContents } = useDocsLayout();
  const ids = tableOfContents.map((e) => e.id);
  const activeId = useActiveHeading(ids);

  if (tableOfContents.length === 0) return null;

  return (
    <aside
      aria-labelledby="docs-toc-heading"
      className="hidden h-full w-56 shrink-0 flex-col border-l-2 border-border bg-sidebar xl:flex xl:w-64"
    >
      <div className="shrink-0 border-b-2 border-sidebar-border px-4 py-4">
        <DocsShareButtons />
      </div>

      <div className="shrink-0 border-b-2 border-sidebar-border px-4 py-3">
        <h2 id="docs-toc-heading" className={cn(RETRO_LABEL, 'text-foreground')}>
          Table of contents
        </h2>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {tableOfContents.map((entry) => {
            const isActive = activeId === entry.id;
            return (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className={cn(
                    RETRO_TOC_LINK,
                    entry.level === 3 && 'pl-5 text-xs',
                    isActive && RETRO_TOC_LINK_ACTIVE
                  )}
                >
                  {entry.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
