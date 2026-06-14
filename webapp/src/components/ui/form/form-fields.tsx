"use client";
import * as React from "react";
import { Label } from "@/components/retroui/Label";
import { Textarea } from "@/components/retroui/Textarea";
import { cn } from "@/lib/core/utils";
export { FormInput } from "@/components/retroui/form/FormField";
export type { FormInputProps } from "@/components/retroui/form/FormField";
export type FormTextareaFieldProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    id: string;
    label: string;
    error?: string;
  };
export const FormTextareaField = React.forwardRef<
  HTMLTextAreaElement,
  FormTextareaFieldProps
>(({ id, label, error, className, value, ...props }, ref) => (
  <div className="grid w-full items-center gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Textarea
      ref={ref}
      id={id}
      aria-invalid={!!error}
      {...(value !== undefined ? { value } : {})}
      className={cn(
        "resize-y min-h-[120px]",
        error &&
          "border-destructive focus:border-destructive focus:ring-destructive/20",
        className,
      )}
      {...props}
    />
    {error ? (
      <p className="text-xs font-medium text-destructive">{error}</p>
    ) : null}
  </div>
));
FormTextareaField.displayName = "FormTextareaField";
