"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BOOKMARK_FOLDER_EMOJIS } from "@contracts/bookmarksApi";
import { cn } from "@/lib/core/utils";
type BookmarkFolderEmojiPickerProps = Readonly<{
  value: string;
  onChange: (emoji: string) => void;
  id?: string;
  disabled?: boolean;
}>;
export function BookmarkFolderEmojiPicker({
  value,
  onChange,
  id: idProp,
  disabled = false,
}: BookmarkFolderEmojiPickerProps) {
  const autoId = useId();
  const listboxId = `${autoId}-emoji-listbox`;
  const id = idProp ?? autoId;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);
  const selectedLabel = value || "None";
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 border-2 border-border bg-background px-3 py-2 font-mono text-xs outline-none ring-primary focus-visible:ring-2 disabled:opacity-50",
          open && "ring-2 ring-primary",
        )}
      >
        <span className="flex items-center gap-2">
          {value ? (
            <span className="text-lg leading-none" aria-hidden>
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          <span className="font-bold uppercase tracking-wide text-muted-foreground">
            {selectedLabel}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Folder emoji"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto border-2 border-border bg-card p-2 shadow-lg"
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[10px] font-bold uppercase tracking-wide hover:bg-muted/60",
                !value && "bg-primary/10 text-primary",
              )}
            >
              None
            </button>
          </li>
          {BOOKMARK_FOLDER_EMOJIS.map((emoji) => (
            <li key={emoji} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === emoji}
                onClick={() => {
                  onChange(emoji);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left text-lg hover:bg-muted/60",
                  value === emoji && "bg-primary/10",
                )}
              >
                <span aria-hidden>{emoji}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
