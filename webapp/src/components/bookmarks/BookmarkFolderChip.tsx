'use client';

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { BookmarkGroupRow } from '@/api/bookmarks';
import { useDropdown } from '@/components/ui/dropdown';
import { cn } from '@/lib/core/utils';

type BookmarkFolderChipProps = Readonly<{
  group: BookmarkGroupRow;
  active: boolean;
  groupsLoading: boolean;
  onSelect: () => void;
  onMakeDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}>;

export function BookmarkFolderChip({
  group,
  active,
  groupsLoading,
  onSelect,
  onMakeDefault,
  onEdit,
  onDelete,
}: BookmarkFolderChipProps) {
  const { open: menuOpen, setOpen: setMenuOpen, close: closeMenu, rootRef: menuRef } = useDropdown();

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 border-2 px-1 py-1',
        active ? 'border-primary bg-primary/10' : 'border-border bg-card'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex max-w-[10rem] items-center gap-1.5 truncate px-2 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest transition-colors',
          active ? 'text-primary' : 'text-foreground hover:bg-muted/50'
        )}
      >
        {group.emoji ? (
          <span className="shrink-0 text-base leading-none normal-case" aria-hidden>
            {group.emoji}
          </span>
        ) : null}
        <span className="truncate">{group.name}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMakeDefault();
        }}
        disabled={groupsLoading || group.isDefault}
        title={
          group.isDefault
            ? 'Default folder for new bookmarks'
            : 'Make default for new bookmarks'
        }
        aria-label={
          group.isDefault
            ? 'Default folder for new bookmarks'
            : `Make ${group.name} the default folder for new bookmarks`
        }
        className={cn(
          'relative mr-0.5 shrink-0 border-2 transition-colors disabled:opacity-100',
          group.isDefault
            ? 'pointer-events-none size-2.5 cursor-default border-purple-600 bg-purple-600 shadow'
            : 'size-2.5 border-muted-foreground/35 bg-transparent hover:border-purple-500 disabled:opacity-50'
        )}
      />
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Folder options for ${group.name}`}
          className="flex size-8 items-center justify-center border-2 border-transparent text-foreground transition-colors hover:border-border hover:bg-muted/50"
        >
          <MoreHorizontal className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
        {menuOpen ? (
          <ul
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] border-2 border-border bg-card py-1 shadow-lg"
          >
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wide hover:bg-muted/60"
              >
                <Pencil className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                Edit folder
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                disabled={group.isDefault}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  if (!group.isDefault) onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wide text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                Delete folder
              </button>
            </li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}
