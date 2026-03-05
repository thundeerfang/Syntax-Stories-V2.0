import { TerminalLoaderPage } from '@/components/loader';

/**
 * Root loading UI (Suspense fallback). Shown when the root segment or a page is loading.
 */
export default function RootLoading() {
  return <TerminalLoaderPage pageName="app" />;
}
