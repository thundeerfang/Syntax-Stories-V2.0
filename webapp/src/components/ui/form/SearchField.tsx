"use client";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/core/utils";
export type SearchFieldProps = Readonly<
  Omit<ComponentPropsWithoutRef<"input">, "type"> & {
    wrapperClassName?: string;
  }
>;
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { className, wrapperClassName, autoComplete = "off", ...props },
    ref,
  ) {
    return (
      <div
        className={cn(
          "relative isolate flex h-[42px] w-full max-w-[13.5rem] shrink-0 sm:max-w-[15rem]",
          wrapperClassName,
        )}
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex w-8 items-center justify-center text-muted-foreground"
          aria-hidden
        >
          <Search className="block size-3.5 shrink-0" strokeWidth={2.25} />
        </span>
        <input
          ref={ref}
          type="search"
          autoComplete={autoComplete}
          className={cn(
            "box-border h-full min-h-0 w-full  border-2 border-border bg-background py-2 pl-8 pr-2 font-mono text-[11px] leading-none outline-none ring-primary placeholder:text-muted-foreground focus-visible:ring-2",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
