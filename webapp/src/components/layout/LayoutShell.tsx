'use client';

import { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MainLayout } from './MainLayout';
import { FloatingActions } from './FloatingActions';
import { NavbarSkeleton } from './NavbarSkeleton';
import { FooterSkeleton } from './FooterSkeleton';
import { cn } from '@/lib/utils';

const LOADING_MS = 400;

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), LOADING_MS);
    return () => clearTimeout(id);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col">
        <NavbarSkeleton />
        <main className="flex flex-1 min-h-0 border-t border-border bg-background">
          <div className={cn('relative flex-1 min-h-0 overflow-hidden p-4 sm:p-6')}>
            <div className="relative z-[1] h-full min-h-[40vh]" />
          </div>
        </main>
        <FooterSkeleton />
      </div>
    );
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
