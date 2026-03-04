'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchDialogStore } from '@/store/searchDialog';
import { Dialog } from '@/components/ui';
import { Alert } from '@/components/retroui/Alert';
import { Search, X, Info } from 'lucide-react';

export function SearchDialog() {
  const { isOpen, close } = useSearchDialogStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value?.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      close();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      titleId="search-dialog-title"
      panelClassName="pointer-events-auto w-full max-w-xl max-h-[85vh] overflow-hidden border-2 border-border bg-card shadow-lg"
      contentClassName="relative p-0"
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="border-b-2 border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            id="search-dialog-input"
            type="search"
            name="q"
            placeholder="Search stories, topics, authors..."
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            aria-label="Search"
          />
          <button
            type="button"
            onClick={close}
            className="shrink-0 p-2 -m-2 rounded cursor-pointer hover:opacity-80 hover:bg-muted/50 transition-all"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
      <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4">
        <p id="search-dialog-title" className="sr-only">
          Search
        </p>
        <Alert status="info" className="flex items-center">
          <Info className="h-4 w-4 mr-4 shrink-0" />
          <Alert.Title>Type and press Enter to search. Try &quot;React&quot;, &quot;API&quot;, or a topic.</Alert.Title>
        </Alert>
      </div>
    </Dialog>
  );
}
