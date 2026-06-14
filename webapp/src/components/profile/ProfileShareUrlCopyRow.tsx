"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { BlockShadowButton } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export type ProfileShareUrlCopyRowProps = Readonly<{
  url: string;
  variant?: "button" | "blockShadow";
  className?: string;
}>;

export function ProfileShareUrlCopyRow({
  url,
  variant = "button",
  className,
}: ProfileShareUrlCopyRowProps) {
  const { copied, copy } = useCopyToClipboard();

  const copyBadge = (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 border-2 border-border px-2.5 py-1.5 text-[9px] font-black uppercase",
        copied
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card group-hover:border-primary",
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </span>
  );

  const inner = (
    <>
      <Link2
        className="size-4 shrink-0 text-primary"
        strokeWidth={2.25}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold text-foreground">
        {url || "—"}
      </span>
      {copyBadge}
    </>
  );

  if (variant === "blockShadow") {
    return (
      <div className={cn("flex gap-2", className)}>
        <BlockShadowButton
          type="button"
          variant="outline"
          fullWidth
          onClick={() => void copy(url)}
          className="group h-auto min-w-0 flex-1 justify-between gap-3 bg-muted/20 p-2.5 pl-3 text-left normal-case tracking-normal hover:bg-muted/40"
        >
          {inner}
        </BlockShadowButton>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <button
        type="button"
        onClick={() => void copy(url)}
        className="group flex min-w-0 flex-1 items-center justify-between gap-3 border-2 border-border bg-muted/20 p-2.5 pl-3 text-left shadow transition-colors hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        {inner}
      </button>
    </div>
  );
}
