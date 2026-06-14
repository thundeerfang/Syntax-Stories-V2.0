export type AlertStatus = "success" | "info" | "error" | "warning";
export const alertStatusStyles: Record<AlertStatus, string> = {
  success:
    "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300",
  info: "border-primary/50 bg-primary/10 text-primary",
  error: "border-destructive/50 bg-destructive/10 text-destructive",
  warning:
    "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};
