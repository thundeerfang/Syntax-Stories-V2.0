"use client";
import { createContext, useMemo, type ReactNode } from "react";
import { alertStatusStyles, type AlertStatus } from "@/lib/styles/alert";
import { cn } from "@/lib/core/utils";
export type { AlertStatus };
const AlertContext = createContext<{
  status: AlertStatus;
} | null>(null);
export interface AlertProps {
  status: AlertStatus;
  className?: string;
  children: ReactNode;
}
export function Alert({ status, className, children }: Readonly<AlertProps>) {
  const contextValue = useMemo(() => ({ status }), [status]);
  return (
    <AlertContext.Provider value={contextValue}>
      <div
        role="alert"
        className={cn(" border-2 p-4", alertStatusStyles[status], className)}
      >
        {children}
      </div>
    </AlertContext.Provider>
  );
}
export function AlertTitle({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("font-semibold", className)} {...props} />;
}
Alert.Title = AlertTitle;
