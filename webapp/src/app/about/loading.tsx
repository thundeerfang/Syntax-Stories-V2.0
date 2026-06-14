import { shell } from "@/lib/styles";
import { cn } from "@/lib/core/utils";

export default function AboutLoading() {
  return (
    <div className={cn(shell.contentRail, "animate-pulse space-y-16 pb-16")}>
      <div className="h-12 w-48 bg-muted" />
      <div className="h-24 max-w-3xl bg-muted" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="h-64 border-2 border-border bg-muted/30 lg:col-span-7" />
        <div className="h-64 border-2 border-border bg-muted/30 lg:col-span-5" />
      </div>
    </div>
  );
}
