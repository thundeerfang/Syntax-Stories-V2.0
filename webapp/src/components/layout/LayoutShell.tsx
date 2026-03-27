'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MainLayout } from './MainLayout';
import { FloatingActions } from './FloatingActions';
import { TerminalLoaderPage } from '@/components/loader';
import { OAUTH_LEAVING_EVENT } from '@/lib/oauthNavigation';

const LOADING_MS = 400;

export function LayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? '';
  const isOAuthCallbackRoute = pathname.includes('-callback');
  const [ready, setReady] = useState(false);

  // OAuth returns should not stack the shell intro loader on top of the callback page loader.
  useLayoutEffect(() => {
    if (isOAuthCallbackRoute) setReady(true);
  }, [isOAuthCallbackRoute]);

  // Leaving the tab before LOADING_MS (e.g. OAuth) runs pagehide cleanup → timeout cleared, ready stays false.
  // BFCache restore does not re-run this effect → terminal loader forever. Recover on back-forward / cache restore.
  useEffect(() => {
    const resume = () => setReady(true);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resume();
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', resume);
    window.addEventListener(OAUTH_LEAVING_EVENT, resume);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', resume);
      window.removeEventListener(OAUTH_LEAVING_EVENT, resume);
    };
  }, []);

  useEffect(() => {
    if (isOAuthCallbackRoute) return;
    const id = setTimeout(() => setReady(true), LOADING_MS);
    return () => clearTimeout(id);
  }, [isOAuthCallbackRoute]);

  if (!ready) {
    return <TerminalLoaderPage pageName="app" />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <MainLayout>{children}</MainLayout>
      <Footer />
      <FloatingActions />
    </div>
  );
}
