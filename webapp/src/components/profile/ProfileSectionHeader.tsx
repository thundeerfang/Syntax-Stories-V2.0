'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

type ProfileSectionHeaderProps = Readonly<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  showAdd?: boolean;
  settingsSection?: string;
  settingsUrl: (section: string) => string;
}>;

const ADD_BTN_CLASS =
  'text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-0.5 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all';

function renderAddControl(
  showAdd: boolean,
  settingsSection: string | undefined,
  settingsUrl: (section: string) => string,
): React.ReactNode {
  if (!showAdd) return null;
  if (settingsSection) {
    return (
      <Link
        href={settingsUrl(settingsSection)}
        className={ADD_BTN_CLASS}
        onClick={(e) => {
          // let the parent handle navigation via settingsUrl side effects; avoid default <Link> routing
          e.preventDefault();
        }}
      >
        <Plus className="size-3" /> Add
      </Link>
    );
  }
  return (
    <button type="button" className={ADD_BTN_CLASS}>
      <Plus className="size-3" /> Add
    </button>
  );
}

export function ProfileSectionHeader({
  icon: Icon,
  title,
  showAdd = true,
  settingsSection,
  settingsUrl,
}: ProfileSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 mb-4">
      <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {renderAddControl(showAdd, settingsSection, settingsUrl)}
    </div>
  );
}
