'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchDialogStore } from '@/store/searchDialog';
import { Dialog } from '@/components/ui';
import { followApi, type FollowUser } from '@/api/follow';
import { Search, X, User, Loader2, Command, ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEBOUNCE_MS = 280;

/**
 * Helper to resolve avatar source using semantic fallback and API base URL
 */
function getAvatarSrc(profileImg: string | undefined, username: string): string {
  if (!profileImg?.trim()) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  }
  return profileImg.startsWith('http') 
    ? profileImg 
    : `${process.env.NEXT_PUBLIC_API_BASE_URL}${profileImg}`;
}

function SearchUserResultsListbox({ children }: Readonly<{ children: ReactNode }>) {
  return <ul className="divide-y-4 divide-border" role="listbox">{children}</ul>; // NOSONAR S6819 S6842
}

function SearchDialogUserHitButton({
  selected,
  className,
  onPick,
  onHover,
  children,
}: Readonly<{
  selected: boolean;
  className: string;
  onPick: () => void;
  onHover: () => void;
  children: ReactNode;
}>) {
  return <button type="button" role="option" aria-selected={selected} onClick={onPick} onMouseEnter={onHover} className={className}>{children}</button>; // NOSONAR S6819
}

export function SearchDialog() {
  const { isOpen, close } = useSearchDialogStore();
  const router = useRouter();
  
  // Refs for logic handling
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Component State
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset dialog state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setUsers([]);
      setSelectedIndex(0);
      // Small timeout to ensure the DOM is ready for focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Core search logic
  const searchUsers = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const id = ++requestIdRef.current;
    setLoading(true);

    followApi.searchUsers(trimmed)
      .then((res) => {
        if (requestIdRef.current === id) {
          setUsers(res.list ?? []);
          setSelectedIndex(0); // Reset selection to top of new results
          setLoading(false);
        }
      })
      .catch(() => {
        if (requestIdRef.current === id) setLoading(false);
      });
  }, []);

  // Debounce effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!query.trim()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => searchUsers(query), DEBOUNCE_MS);
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchUsers]);

  // Handle Keyboard Navigation (Arrows + Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < users.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && users[selectedIndex]) {
      e.preventDefault();
      handleUserSelect(users[selectedIndex].username);
    }
  };

  const handleUserSelect = (username: string) => {
    router.push(`/u/${username}`);
    close();
  };

  let footerStatusLabel = 'System_Ready';
  if (loading) {
    footerStatusLabel = 'Fetching_Data...';
  } else if (users.length > 0) {
    footerStatusLabel = `Identity_Matches: ${users.length}`;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      titleId="search-dialog-title"
      // Neobrutalist Panel Styling with semantic vars
      panelClassName="pointer-events-auto w-full max-w-xl max-h-[80vh] overflow-hidden border-4 border-border bg-background shadow-[12px_12px_0px_0px_hsl(var(--border))]"
      contentClassName="relative p-0"
      showCloseButton={false}
    >
      {/* 1. Terminal Header */}
      <div className="bg-foreground text-background px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Command className="size-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">User_Query_Terminal</span>
        </div>
        <button 
          onClick={close} 
          className="hover:bg-destructive hover:text-destructive-foreground p-1 transition-colors"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* 2. Input Section */}
      <form onSubmit={(e) => e.preventDefault()} className="border-b-4 border-border">
        <div className="flex items-center gap-3 px-4 py-5 bg-background">
          <span className="font-mono font-black text-xl text-primary" aria-hidden="true">{'>'}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search database by identity..."
            className="flex-1 bg-transparent text-lg font-mono font-black uppercase outline-none placeholder:text-muted-foreground/30 placeholder:normal-case placeholder:font-bold"
            autoComplete="off"
          />
          {loading && <Loader2 className="h-5 w-5 animate-spin text-foreground" strokeWidth={3} />}
        </div>
      </form>

      {/* 3. Results Area - Fixed to prevent horizontal scroll */}
      <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden bg-muted/10">
        <AnimatePresence mode="popLayout">
          {query.trim() ? (
            <div className="flex flex-col">
              {users.length === 0 && !loading ? (
                /* No Results State */
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="p-12 text-center"
                >
                  <User className="size-12 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="font-black uppercase text-xs text-muted-foreground">
                    No directory matches found for: <span className="text-foreground">{query}</span>
                  </p>
                </motion.div>
              ) : (
                <SearchUserResultsListbox>
                  {users.map((u, index) => (
                    <motion.li 
                      key={u.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="w-full overflow-hidden"
                    >
                      <SearchDialogUserHitButton
                        selected={selectedIndex === index}
                        onPick={() => handleUserSelect(u.username)}
                        onHover={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-all outline-none ${
                          selectedIndex === index
                            ? 'bg-primary text-primary-foreground translate-x-1'
                            : 'bg-background hover:bg-muted/30'
                        }`}
                      >
                        {/* Avatar with Neobrutalist Shadow */}
                        <div className="relative shrink-0">
                           <div className="absolute inset-0 bg-border translate-x-1 translate-y-1" />
                           <div className="relative size-12 border-2 border-border bg-muted overflow-hidden">
                              <img 
                                src={getAvatarSrc(u.profileImg, u.username)} 
                                alt={u.fullName} 
                                className="size-full object-cover" 
                              />
                           </div>
                        </div>
                        
                        {/* User Metadata */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-mono text-base font-black truncate ${
                            selectedIndex === index ? 'text-primary-foreground' : 'text-foreground'
                          }`}>
                            {u.fullName}
                          </p>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${
                            selectedIndex === index ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            @{u.username}
                          </p>
                        </div>

                        {/* Action Badge */}
                        {selectedIndex === index && (
                          <div className="flex items-center gap-2 bg-foreground text-background px-2 py-1 shrink-0 animate-in fade-in zoom-in duration-200">
                            <span className="hidden sm:inline text-[9px] font-black uppercase">Execute</span>
                            <CornerDownLeft className="size-3" strokeWidth={3} />
                          </div>
                        )}
                      </SearchDialogUserHitButton>
                    </motion.li>
                  ))}
                </SearchUserResultsListbox>
              )}
            </div>
          ) : (
            /* Idle / Initial Hint State */
            <div className="p-8">
              <div className="border-4 border-dashed border-border/40 p-8 text-center bg-background/50">
                <Search className="size-8 mx-auto mb-3 text-muted-foreground/20" strokeWidth={3} />
                <p className="text-[11px] font-black uppercase text-muted-foreground/50 tracking-widest">
                  Ready for input...
                </p>
              </div>
              
              {/* Controls Legend */}
              <div className="mt-8 flex justify-center gap-6">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-muted-foreground/60">
                  <span className="flex flex-col gap-0.5">
                    <span className="p-0.5 border border-border bg-background"><ArrowUp className="size-2" /></span>
                    <span className="p-0.5 border border-border bg-background"><ArrowDown className="size-2" /></span>
                  </span>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-muted-foreground/60">
                  <span className="px-1.5 py-1 border border-border bg-background">ESC</span>
                  <span>Close</span>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Footer Status Bar */}
      <div className="border-t-4 border-border bg-background px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className={`size-1.5 rounded-full ${loading ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
           <span className="text-[9px] font-black uppercase text-muted-foreground">{footerStatusLabel}</span>
        </div>
        <span className="text-[9px] font-black uppercase text-muted-foreground/30">Query_Interface_v2</span>
      </div>
    </Dialog>
  );
}