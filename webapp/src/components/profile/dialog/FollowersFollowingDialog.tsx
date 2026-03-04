'use client';

import React, { useState } from 'react';
import { Users, Search, ChevronRight } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

// Dummy users for demo
const DUMMY_FOLLOWERS = [
  { id: '1', name: 'Alex Dev', username: '@alexdev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  { id: '2', name: 'Sam Code', username: '@samcode', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam' },
];
const DUMMY_FOLLOWING = [
  { id: '1', name: 'Jordan Build', username: '@jordanbuild', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan' },
  { id: '2', name: 'Casey Ship', username: '@caseyship', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Casey' },
];

type Tab = 'followers' | 'following';

export interface FollowersFollowingDialogProps {
  open: boolean;
  onClose: () => void;
  followersCount?: number;
  followingCount?: number;
}

export function FollowersFollowingDialog({
  open,
  onClose,
  followersCount = 0,
  followingCount = 0,
}: FollowersFollowingDialogProps) {
  const [tab, setTab] = useState<Tab>('followers');
  const [search, setSearch] = useState('');

  const list = tab === 'followers' ? DUMMY_FOLLOWERS : DUMMY_FOLLOWING;
  const filtered = search.trim()
    ? list.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase())
      )
    : list;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="followers-dialog-title"
      contentClassName="relative p-0 pt-10 flex flex-col flex-1 min-h-0"
    >
      <h2 id="followers-dialog-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2 px-6 mb-4">
        <Users className="size-4 text-primary" /> Followers & Following
      </h2>
      <div className="flex border-b-2 border-border px-6">
        <button
          type="button"
          onClick={() => setTab('followers')}
          className={cn(
            'flex-1 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 -mb-0.5 transition-colors',
            tab === 'followers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Followers {followersCount}
        </button>
        <button
          type="button"
          onClick={() => setTab('following')}
          className={cn(
            'flex-1 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 -mb-0.5 transition-colors',
            tab === 'following'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Following {followingCount}
        </button>
      </div>
      <div className="p-4 border-b-2 border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={tab === 'followers' ? 'Search followers...' : 'Search following...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 border-border bg-muted/30 text-[10px] font-bold uppercase tracking-widest placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {filtered.length === 0 ? (
          <p className="text-[10px] font-bold text-muted-foreground uppercase text-center py-8">
            {search.trim() ? 'No matches.' : tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 border-2 border-border bg-muted/5 hover:bg-muted/20 transition-colors"
            >
              <img src={user.avatar} alt="" className="size-10 border-2 border-border shrink-0 object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase truncate">{user.name}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase truncate">{user.username}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
