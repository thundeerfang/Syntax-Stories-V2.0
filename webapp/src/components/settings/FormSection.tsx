import type { ReactNode } from "react";
export function FormSection({
  title,
  children,
}: Readonly<{
  title?: string;
  children: ReactNode;
}>) {
  return (
    <div className="space-y-4 pt-6 border-t-2 border-border/50 first:border-t-0 first:pt-0 min-w-0">
      {title ? (
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="grid gap-4 min-w-0">{children}</div>
    </div>
  );
}
