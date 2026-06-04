'use client';

import { useEffect } from 'react';
import type { DocsTocEntry } from '@/lib/markdown/parseMarkdownHeadings';
import { useDocsLayout } from './DocsLayoutContext';

type Props = {
  entries: DocsTocEntry[];
};

/** Registers parsed article headings with the layout sidebar TOC card. */
export function DocsTocSync({ entries }: Props) {
  const setTableOfContents = useDocsLayout().setTableOfContents;

  useEffect(() => {
    setTableOfContents(entries);
    return () => setTableOfContents([]);
  }, [entries, setTableOfContents]);

  return null;
}
