"use client";
import { cn } from "@/lib/core/utils";
export function ProfileActivitySparklinePlaceholder({
  className,
  height = 56,
}: Readonly<{
  className?: string;
  height?: number;
}>) {
  return (
    <svg
      viewBox="0 0 200 56"
      preserveAspectRatio="none"
      className={cn("w-full text-muted-foreground/30", className)}
      style={{ height }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0,44 L16,43 L32,45 L48,41 L64,42 L80,39 L96,40 L112,37 L128,38 L144,36 L160,37 L176,35 L200,36 L200,56 L0,56 Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.55"
        d="M0,44 L16,43 L32,45 L48,41 L64,42 L80,39 L96,40 L112,37 L128,38 L144,36 L160,37 L176,35 L200,36"
      />
    </svg>
  );
}
