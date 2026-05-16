'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ErrorIllustrationLottie } from '@/components/ui/ErrorIllustrationLottie';

export default function ErrorPage({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-var(--header-height)-8rem)] bg-background text-foreground">
      <div className="mx-auto flex max-w-[90rem] flex-col items-center justify-center py-16 text-center sm:py-20">
        <ErrorIllustrationLottie variant="500" widthPx={260} className="mb-6" />
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">
          Error_500
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          An unexpected error occurred. You can try again or return to the home feed.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex border-4 border-border bg-card px-6 py-3 text-xs font-black uppercase tracking-widest text-foreground shadow-[4px_4px_0_0_var(--border)] transition-colors hover:bg-muted/60"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex border-4 border-border bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-colors hover:brightness-110"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
