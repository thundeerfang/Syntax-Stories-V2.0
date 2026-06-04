import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HelpFaqSection } from '@/components/help/HelpFaqSection';
import { fetchHelpHubConfig } from '@/lib/api/helpPublic';

export const metadata: Metadata = {
  title: 'Help — Syntax Stories',
  description: 'Frequently asked questions and help center articles.',
};

function HelpFaqFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Loading help…
      </p>
    </div>
  );
}

export default async function HelpHubPage() {
  const config = await fetchHelpHubConfig();

  return (
    <Suspense fallback={<HelpFaqFallback />}>
      <HelpFaqSection config={config} />
    </Suspense>
  );
}
