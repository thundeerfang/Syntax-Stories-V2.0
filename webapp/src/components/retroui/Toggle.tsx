"use client";
import * as React from "react";
import { cn } from "@/lib/core/utils";
export interface ToggleProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      pressed: controlledPressed,
      defaultPressed = false,
      onPressedChange,
      className,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultPressed);
    const isControlled = controlledPressed !== undefined;
    const pressed = isControlled ? controlledPressed : uncontrolled;
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const next = !pressed;
      if (!isControlled) setUncontrolled(next);
      onPressedChange?.(next);
      onClick?.(e);
    };
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={pressed}
        data-state={pressed ? "on" : "off"}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 border-2 border-border font-bold text-[10px] uppercase tracking-wide transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          !pressed &&
            "bg-muted/40 text-muted-foreground shadow hover:bg-muted/60",
          pressed && "bg-primary text-primary-foreground border-primary shadow",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Toggle.displayName = "Toggle";
