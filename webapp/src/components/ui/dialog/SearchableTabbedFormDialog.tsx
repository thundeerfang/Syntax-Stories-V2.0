"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { FormDialog, type FormDialogProps } from "./FormDialog";
import { cn } from "@/lib/core/utils";

export type SearchableTabbedFormDialogTab<T extends string> = Readonly<{
  id: T;
  label: ReactNode;
}>;

export type SearchableTabbedFormDialogProps<T extends string> = Readonly<{
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  titleIcon?: ReactNode;
  subtitle?: ReactNode;
  panelClassName?: string;
  tabs?: readonly SearchableTabbedFormDialogTab<T>[];
  activeTab?: T;
  onTabChange?: (tab: T) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  children: ReactNode;
}> &
  Pick<FormDialogProps, "bodyClassName">;

export function DialogSearchEmptyState() {
  return (
    <>
      <Search className="mb-3 size-12 text-muted-foreground/60" />
      <p className="text-[10px] font-black uppercase text-muted-foreground">
        No matches
      </p>
      <p className="mt-1 text-[9px] font-bold text-muted-foreground/80">
        Try a different search.
      </p>
    </>
  );
}

export function SearchableTabbedFormDialog<T extends string>({
  open,
  onClose,
  titleId,
  title,
  titleIcon,
  subtitle,
  panelClassName,
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  bodyClassName = "flex min-h-0 flex-1 flex-col overflow-hidden p-0",
}: SearchableTabbedFormDialogProps<T>) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      titleIcon={titleIcon}
      subtitle={subtitle}
      panelClassName={cn("max-w-lg", panelClassName)}
      bodyClassName={bodyClassName}
    >
      {tabs && tabs.length > 0 && activeTab != null && onTabChange ? (
        <div className="flex shrink-0 border-b-2 border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "-mb-0.5 flex-1 border-b-2 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="shrink-0 border-b-2 border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border-2 border-border bg-muted/30 py-2 pl-9 pr-3 text-[10px] font-bold uppercase tracking-widest placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {children}
      </div>
    </FormDialog>
  );
}
