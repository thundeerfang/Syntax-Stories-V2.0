"use client";
import { cn } from "@/lib/core/utils";
import {
  ACTIVITY_TAB_META,
  type ActivityTab,
} from "@/lib/profile/profilePageHelpers";
export function ProfileActivityTabs({
  tabs,
  value,
  onChange,
}: Readonly<{
  tabs: readonly ActivityTab[];
  value: ActivityTab;
  onChange: (tab: ActivityTab) => void;
}>) {
  return (
    <div className="flex gap-1">
      {tabs.map((tab) => {
        const active = value === tab;
        const { label, icon: Icon } = ACTIVITY_TAB_META[tab];
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 px-3 py-2 font-black text-[10px] uppercase tracking-widest border-2 transition-all duration-200 ease-out",
              active
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-muted-foreground/30 bg-card text-muted-foreground/65 hover:border-muted-foreground/45 hover:bg-muted/40 hover:text-muted-foreground",
            )}
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
    </div>
  );
}
