import { cn } from "@/lib/core/utils";
export const authDialog = {
  panel: cn(
    "auth-dialog-panel flex w-full max-w-[min(100vw-1.5rem,24rem)] flex-col",
    "overflow-hidden border-2 border-border dark:border-border/60",
    "shadow-[0_28px_80px_-12px_rgba(0,0,0,0.35)]",
  ),
  panelScroll: "overflow-y-auto overscroll-y-contain ss-scrollbar-hide",
  backdrop:
    "bg-black/50 backdrop-blur-md backdrop-saturate-150 dark:bg-black/65",
  content: "relative flex min-h-0 flex-col overflow-hidden p-0",
  body: "min-h-0 flex-1 overflow-x-hidden px-4 pb-4 pt-1",
  chromeBtn: cn(
    "flex size-9 shrink-0 items-center justify-center border-2 border-border bg-card dark:border-border/60",
    "text-muted-foreground shadow-sm backdrop-blur-sm transition-colors",
    "hover:border-primary hover:text-foreground",
    "disabled:pointer-events-none disabled:opacity-40",
  ),
  input: cn(
    "auth-dialog-input w-full border-2 border-border px-3 py-2.5 text-sm font-medium normal-case dark:border-border/60",
    "text-card-foreground transition-colors",
    "placeholder:text-muted-foreground/50",
    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
  ),
  socialBtnEnabled: cn(
    "relative flex w-full items-center justify-center border-2 text-[10px] font-black uppercase tracking-widest",
    "border-border bg-card py-2.5 pl-9 pr-2 shadow-sm backdrop-blur-sm dark:border-border/60",
    "text-card-foreground transition-all",
    "hover:border-primary/55 hover:bg-primary/12 hover:shadow-md active:scale-[0.98]",
  ),
  socialBtnDisabled: cn(
    "relative flex w-full items-center justify-center border-2 text-[10px] font-black uppercase tracking-widest",
    "cursor-not-allowed border-border bg-muted/25 py-2 pl-9 pr-2 dark:border-border/50",
    "text-muted-foreground opacity-50",
  ),
} as const;
