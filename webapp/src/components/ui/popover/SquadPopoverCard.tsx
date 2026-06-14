"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/core/utils";
import type { PublicFeedSquad } from "@/types/blog";
import { resolveSquadIconUrl, resolveSquadMediaUrl } from "@/lib/squads/squadMedia";
import { PROFILE_POPOVER_CARD_WIDTH_PX } from "./ProfilePopoverCard";
export const SQUAD_POPOVER_CARD_WIDTH_PX = PROFILE_POPOVER_CARD_WIDTH_PX;
export const SQUAD_POPOVER_CARD_HEIGHT_PX = 172;
export function squadPopoverIconSrc(squad: PublicFeedSquad): string {
  return resolveSquadIconUrl(squad.iconUrl, squad.slug);
}
export type SquadPopoverCardProps = Readonly<{
  squad: PublicFeedSquad;
  squadHref: string;
  interactiveSurface: boolean;
}>;
export function SquadPopoverCard({
  squad,
  squadHref,
  interactiveSurface,
}: SquadPopoverCardProps) {
  const bannerResolved = resolveSquadMediaUrl(squad.coverBannerUrl);
  let coverBannerEl: ReactNode;
  if (bannerResolved) {
    coverBannerEl = (
      <img src={bannerResolved} alt="" className="h-full w-full object-cover" />
    );
  } else {
    coverBannerEl = <div className="h-full w-full gradient-auto" />;
  }
  const iconSrc = squadPopoverIconSrc(squad);
  const inner = (
    <>
      <div className="relative">
        <div className="relative z-0 h-20 overflow-hidden bg-muted">{coverBannerEl}</div>
        <div className="absolute left-3 top-full z-10 -translate-y-1/2">
          <div
            className={cn(
              "flex size-[52px] items-center justify-center overflow-hidden  border-2 border-border bg-card",
            )}
          >
            <img src={iconSrc} alt="" className="size-full object-cover" />
          </div>
        </div>
      </div>
      <div className="px-3 pb-2.5 pt-7">
        <p className="line-clamp-2 text-left text-[11px] font-black uppercase leading-tight tracking-tight text-foreground">
          {squad.name}
        </p>
        <p className="mt-0.5 text-left font-mono text-[10px] text-primary">s/{squad.slug}</p>
        {squad.visibility === "private" ? (
          <p className="mt-1.5 text-left font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            Private squad
          </p>
        ) : null}
        {typeof squad.memberCount === "number" ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
            <span
              className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-foreground"
              title="Members"
            >
              <Users className="size-3.5 shrink-0 text-primary" aria-hidden />
              {squad.memberCount}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
  const shellClass =
    "block w-[260px] border-2 border-border bg-card shadow outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
  if (interactiveSurface) {
    return (
      <Link href={squadHref} className={shellClass}>
        {inner}
      </Link>
    );
  }
  return <div className={cn(shellClass, "cursor-default")}>{inner}</div>;
}
