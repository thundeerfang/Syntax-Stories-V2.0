"use client";
import Link from "next/link";
import { FileText, NotebookPen, Repeat2, Trash2 } from "lucide-react";
import { cn } from "@/lib/core/utils";
export type ProfileBlogsStatusTab = "published" | "drafts" | "deleted";
const TAB_META: Record<
  ProfileBlogsStatusTab,
  {
    label: string;
    icon: typeof FileText;
  }
> = {
  published: { label: "Published", icon: FileText },
  drafts: { label: "Drafts", icon: NotebookPen },
  deleted: { label: "Deleted", icon: Trash2 },
};
const tabBtnClass = (active: boolean) =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 px-2.5 py-1.5 font-black text-[10px] uppercase tracking-widest border-2 transition-all duration-200 ease-out",
    active
      ? "border-primary bg-primary text-primary-foreground shadow"
      : "border-muted-foreground/30 bg-card text-muted-foreground/65 hover:border-muted-foreground/45 hover:bg-muted/40 hover:text-muted-foreground",
  );
export function ProfileBlogsStatusTabs({
  tab,
  onTabChange,
  isOwner,
  showRepostsLink,
}: Readonly<{
  tab: ProfileBlogsStatusTab;
  onTabChange: (tab: ProfileBlogsStatusTab) => void;
  isOwner: boolean;
  showRepostsLink: boolean;
}>) {
  const statusTabs: ProfileBlogsStatusTab[] = isOwner
    ? ["published", "drafts", "deleted"]
    : ["published"];
  return (
    <div className="flex shrink-0 items-center gap-1">
      {statusTabs.map((id) => {
        const active = tab === id;
        const { label, icon: Icon } = TAB_META[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={tabBtnClass(active)}
            aria-current={active ? "true" : undefined}
          >
            {active ? (
              <Icon
                className="size-3.5 shrink-0"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : null}
            {label}
          </button>
        );
      })}
      {showRepostsLink ? (
        <Link
          href="/reposts"
          className={cn(tabBtnClass(false), "no-underline")}
        >
          <Repeat2
            className="size-3.5 shrink-0"
            strokeWidth={2.5}
            aria-hidden
          />
          Reposts
        </Link>
      ) : null}
    </div>
  );
}
