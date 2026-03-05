'use client';

import { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MainLayout } from './MainLayout';
import { FloatingActions } from './FloatingActions';
import { TerminalLoaderPage } from '@/components/loader';

const LOADING_MS = 400;

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), LOADING_MS);
    return () => clearTimeout(id);
  }, []);

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
