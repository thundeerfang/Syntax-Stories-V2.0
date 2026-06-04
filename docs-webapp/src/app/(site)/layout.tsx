import { DocsAppLayout } from '@/components/layout/DocsAppLayout';
import { DocsThemeProvider } from '@/components/layout/DocsThemeProvider';
import {
  fetchPublishedHelpList,
  HELP_CATEGORY_DOCUMENTATION,
} from '@/lib/api/publicHelp';
import { docsSiteName } from '@/lib/config/site';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { articles } = await fetchPublishedHelpList({
    category: HELP_CATEGORY_DOCUMENTATION,
    pageSize: 80,
  });

  const navArticles = articles.map((a) => ({
    slug: a.slug,
    title: a.title,
    canonicalPath: a.canonicalPath,
  }));

  return (
    <DocsThemeProvider>
      <DocsAppLayout articles={navArticles} siteName={docsSiteName()}>
        {children}
      </DocsAppLayout>
    </DocsThemeProvider>
  );
}
