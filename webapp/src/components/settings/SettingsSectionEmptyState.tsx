import type { ElementType } from "react";
export function SettingsSectionEmptyState({
  icon: Icon,
  title,
  tagline,
}: Readonly<{
  icon: ElementType;
  title: string;
  tagline: string;
}>) {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border bg-muted/10 py-12 px-6 text-center">
      <span className="flex size-16 items-center justify-center border-2 border-border bg-muted/50 text-muted-foreground mb-4">
        <Icon className="size-8" strokeWidth={1.5} />
      </span>
      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-xs text-muted-foreground">{tagline}</p>
    </div>
  );
}
