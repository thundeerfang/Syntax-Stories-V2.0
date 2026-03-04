'use client';

import { useSearchParams } from 'next/navigation';
import { useSearchDialogStore } from '@/store/searchDialog';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const openSearch = useSearchDialogStore((s) => s.open);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground border-b-2 border-border pb-4">
        Search
      </h1>
      {q ? (
        <>
          <p className="mt-4 text-muted-foreground">
            Results for <strong className="text-foreground">&quot;{q}&quot;</strong>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Search results will appear here. Try the command palette with{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">Ctrl+K</kbd> or{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd> to search again.
          </p>
        </>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border py-16">
          <Search className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Enter a search term above or use the search command.
          </p>
          <button
            type="button"
            onClick={openSearch}
            className="border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Open search
          </button>
        </div>
      )}
    </div>
  );
}
