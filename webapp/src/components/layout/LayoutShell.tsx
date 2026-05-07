'use client';

import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MainLayout } from './MainLayout';
import { FloatingActions } from './FloatingActions';
import { FeedbackDialogWrapper } from '@/components/feedback/FeedbackDialogWrapper';

/**
 * Renders the app chrome immediately. Route transitions use `loading.tsx` + page-level
 * skeletons — an artificial delay here used to cause a generic “dummy” shell before
 * every route-specific skeleton on full load.
 */
export function LayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <MainLayout>{children}</MainLayout>
      <Footer />
      <FloatingActions />
      <FeedbackDialogWrapper />
    </div>
  );
}
