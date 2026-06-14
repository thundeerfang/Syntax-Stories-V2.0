import type { SearchHit } from "@contracts/searchApi";
import {
  FileText,
  Hash,
  Layers,
  LayoutGrid,
  User,
  UsersRound,
  CornerDownLeft,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/core/utils";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
const TYPE_ICONS: Record<
  SearchHit["type"],
  ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>
> = {
  user: User,
  tag: Hash,
  category: Layers,
  squad: UsersRound,
  blog: FileText,
  feature: LayoutGrid,
};
export function SearchHitRow({
  hit,
  selected,
  onPick,
  onHover,
}: Readonly<{
  hit: SearchHit;
  selected: boolean;
  onPick: () => void;
  onHover: () => void;
}>) {
  const Icon = TYPE_ICONS[hit.type];
  const showAvatar =
    hit.type === "user" || (hit.type === "squad" && hit.imageUrl);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      onMouseEnter={onHover}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors outline-none",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted/30",
      )}
    >
      <div className="relative shrink-0">
        {showAvatar ? (
          <div className="relative size-10 border-2 border-border bg-muted overflow-hidden">
            <img
              src={resolveProfileMediaUrl(hit.imageUrl, hit.id)}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div
            className={cn(
              "flex size-10 items-center justify-center border-2 border-border",
              selected ? "bg-primary-foreground/10" : "bg-muted/40",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-mono text-sm font-black",
            selected ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {hit.type === "tag" ? `#${hit.label.replace(/^#/, "")}` : hit.label}
        </p>
        {hit.sublabel ? (
          <p
            className={cn(
              "truncate text-[10px] font-bold uppercase tracking-wider",
              selected ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {hit.sublabel}
          </p>
        ) : null}
      </div>

      {selected ? (
        <div className="flex shrink-0 items-center gap-2 bg-foreground px-2 py-1 text-background">
          <span className="hidden text-[9px] font-black uppercase sm:inline">
            Go
          </span>
          <CornerDownLeft className="size-3" strokeWidth={3} aria-hidden />
        </div>
      ) : null}
    </button>
  );
}
