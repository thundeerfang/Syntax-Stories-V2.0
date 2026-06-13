'use client';

import React from 'react';
import { Plus } from 'lucide-react';

type ProfileSectionHeaderProps = Readonly<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  showAdd?: boolean;
  onAddClick?: () => void;
}>;

const ADD_BTN_CLASS =
  'text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-0.5 bg-card shadow active:shadow-none active:translate-x-0.5 transition-all';

export function ProfileSectionHeader({
  icon: Icon,
  title,
  showAdd = true,
  onAddClick,
}: ProfileSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 mb-4">
      <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {showAdd && onAddClick ? (
        <button type="button" onClick={onAddClick} className={ADD_BTN_CLASS}>
          <Plus className="size-3" /> Add
        </button>
      ) : null}
    </div>
  );
}
