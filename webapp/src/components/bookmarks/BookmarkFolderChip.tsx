"use client";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { BookmarkGroupRow } from "@/api/bookmarks";
import { useDropdown } from "@/components/ui/dropdown";
import {
  RetroFilterPill,
  RetroIconButton,
  RetroMenuItemButton,
  RetroStatusDot,
} from "@/components/ui/button";
import { cn } from "@/lib/core/utils";
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
  const {
    open: menuOpen,
    setOpen: setMenuOpen,
    close: closeMenu,
    rootRef: menuRef,
  } = useDropdown();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 border-2 px-1 py-1",
        active ? "border-primary bg-primary/10" : "border-border bg-card",
      )}
    >
      <RetroFilterPill
        active={active}
        onClick={onSelect}
        className="max-w-[10rem] gap-1.5 truncate border-transparent bg-transparent px-2 py-1.5 shadow-none hover:bg-muted/50"
      >
        {group.emoji ? (
          <span
            className="shrink-0 text-base leading-none normal-case"
            aria-hidden
          >
            {group.emoji}
          </span>
        ) : null}
        <span className="truncate">{group.name}</span>
      </RetroFilterPill>
      <RetroStatusDot
        active={group.isDefault}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMakeDefault();
        }}
        disabled={groupsLoading || group.isDefault}
        title={
          group.isDefault
            ? "Default folder for new bookmarks"
            : "Make default for new bookmarks"
        }
        aria-label={
          group.isDefault
            ? "Default folder for new bookmarks"
            : `Make ${group.name} the default folder for new bookmarks`
        }
        className="mr-0.5"
      />
      <div ref={menuRef} className="relative shrink-0">
        <RetroIconButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Folder options for ${group.name}`}
        >
          <MoreHorizontal className="size-4" strokeWidth={2.25} aria-hidden />
        </RetroIconButton>
        {menuOpen ? (
          <ul
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] border-2 border-border bg-card py-1 shadow-lg"
          >
            <li role="none">
              <RetroMenuItemButton
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onEdit();
                }}
              >
                <Pencil
                  className="size-3.5 shrink-0"
                  strokeWidth={2.25}
                  aria-hidden
                />
                Edit folder
              </RetroMenuItemButton>
            </li>
            <li role="none">
              <RetroMenuItemButton
                type="button"
                variant="destructive"
                disabled={group.isDefault}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  if (!group.isDefault) onDelete();
                }}
              >
                <Trash2
                  className="size-3.5 shrink-0"
                  strokeWidth={2.25}
                  aria-hidden
                />
                Delete folder
              </RetroMenuItemButton>
            </li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}
