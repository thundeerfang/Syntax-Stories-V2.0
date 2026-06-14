"use client";
import Link from "next/link";
import { Hash } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { retro } from "@/lib/styles";
type HashtagBadgeLinkProps = Readonly<{
  slug: string;
  label: string;
  postCount?: number;
  className?: string;
}>;
export type { HashtagBadgeLinkProps };
export function HashtagBadgeLink({
  slug,
  label,
  postCount,
  className,
}: HashtagBadgeLinkProps) {
  return (
    <Link
      href={`/topics/${encodeURIComponent(slug)}`}
      className={cn(
        "inline-flex items-center gap-1 bg-card px-3 py-2 font-mono text-[10px] font-black uppercase transition-colors hover:bg-primary hover:text-primary-foreground",
        retro.border,
        retro.shadowPress,
        className,
      )}
    >
      <Hash className="size-3 shrink-0 opacity-70" aria-hidden />
      {label}
      {typeof postCount === "number" ? (
        <span className="opacity-50">[{postCount.toLocaleString()}]</span>
      ) : null}
    </Link>
  );
}
