'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DocsTocEntry } from '@/lib/markdown/parseMarkdownHeadings';

export type DocsNavArticle = {
  slug: string;
  title: string;
  canonicalPath?: string;
};

type DocsLayoutContextValue = {
  articles: DocsNavArticle[];
  siteName: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredArticles: DocsNavArticle[];
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  tableOfContents: DocsTocEntry[];
  setTableOfContents: (entries: DocsTocEntry[]) => void;
};

const DocsLayoutContext = createContext<DocsLayoutContextValue | null>(null);

type ProviderProps = {
  articles: DocsNavArticle[];
  siteName: string;
  children: ReactNode;
};

export function DocsLayoutProvider({ articles, siteName, children }: ProviderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tableOfContents, setTableOfContentsState] = useState<DocsTocEntry[]>([]);

  const setTableOfContents = useCallback((entries: DocsTocEntry[]) => {
    setTableOfContentsState(entries);
  }, []);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  const value = useMemo(
    () => ({
      articles,
      siteName,
      searchQuery,
      setSearchQuery,
      filteredArticles,
      mobileNavOpen,
      setMobileNavOpen,
      tableOfContents,
      setTableOfContents,
    }),
    [articles, siteName, searchQuery, filteredArticles, mobileNavOpen, tableOfContents, setTableOfContents]
  );

  return <DocsLayoutContext.Provider value={value}>{children}</DocsLayoutContext.Provider>;
}

export function useDocsLayout(): DocsLayoutContextValue {
  const ctx = useContext(DocsLayoutContext);
  if (!ctx) throw new Error('useDocsLayout must be used within DocsLayoutProvider');
  return ctx;
}
