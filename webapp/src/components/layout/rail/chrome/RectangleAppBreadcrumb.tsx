"use client";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/core/utils";
export type RectangleAppBreadcrumbItem = {
  href?: string;
  label: string;
};
type RectangleAppBreadcrumbProps = Readonly<{
  items: RectangleAppBreadcrumbItem[];
  className?: string;
}>;
export function RectangleAppBreadcrumb({
  items,
  className,
}: RectangleAppBreadcrumbProps) {
  if (!items.length) return null;
  return (
    <div
      className={cn(
        "inline-flex w-fit min-w-0 max-w-full shrink-0 items-center border-2 border-border bg-card px-2.5 py-1.5 shadow",
        className,
      )}
    >
      <nav aria-label="Breadcrumb">
        <ol className="flex max-w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[10px] font-black uppercase tracking-[0.18em]">
          {items.map((item, i) => {
            return (
              <li
                key={`${item.label}-${i}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                {i > 0 ? (
                  <ChevronRight
                    className="size-3 shrink-0 text-muted-foreground/60"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex min-w-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.href === "/" ? (
                      <Home
                        className="size-3.5 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    ) : null}
                    <span className="truncate">{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className="truncate text-foreground"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
