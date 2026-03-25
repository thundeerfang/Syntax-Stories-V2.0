'use client';

import * as React from 'react';
import { Input } from '../Input';
import { Label } from '../Label';
import { Textarea } from '../Textarea';
import { Checkbox } from '../Checkbox';
import { cn } from '@/lib/utils';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ id, label, error, className, ...props }, ref) => (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive focus:border-destructive focus:ring-destructive/20', className)}
        {...props}
      />
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  )
);
FormInput.displayName = 'FormInput';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  /** Optional max length for showing char count (e.g. "120/5000") */
  maxLength?: number;
  value?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ id, label, error, maxLength, value = '', className, ...props }, ref) => (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        ref={ref}
        id={id}
        aria-invalid={!!error}
        value={value}
        className={cn(error && 'border-destructive focus:border-destructive focus:ring-destructive/20', className)}
        {...props}
      />
      {maxLength != null && (
        <p className="text-[9px] text-muted-foreground">{String(value).length}/{maxLength}</p>
      )}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  )
);
FormTextarea.displayName = 'FormTextarea';

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  onCheckedChange?: (checked: boolean) => void;
}

export const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ id, label, onCheckedChange, className, ...props }, ref) => (
    <div className="flex gap-2 items-center">
      <Checkbox ref={ref} id={id} onCheckedChange={onCheckedChange} className={cn('shrink-0', className)} {...props} />
      <label htmlFor={id} className="text-[10px] font-bold uppercase text-foreground cursor-pointer select-none">
        {label}
      </label>
    </div>
  )
);
FormCheckbox.displayName = 'FormCheckbox';

export interface FormDateProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  error?: string;
}

/** Date input (type="date") with Label. Clicking the input opens the native picker (showPicker only from input click). */
export const FormDate = React.forwardRef<HTMLInputElement, FormDateProps>(
  ({ id, label, error, className, onClick, ...props }, ref) => {
    const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
      onClick?.(e);
      const el = e.currentTarget;
      if (typeof el.showPicker === 'function') {
        try {
          el.showPicker();
        } catch {
          /* showPicker requires user gesture; ignore if not allowed */
        }
      }
    };

    return (
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          ref={ref}
          id={id}
          type="date"
          aria-invalid={!!error}
          className={cn('cursor-pointer', error && 'border-destructive focus:border-destructive focus:ring-destructive/20', className)}
          onClick={handleInputClick}
          {...props}
        />
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      </div>
    );
  }
);
FormDate.displayName = 'FormDate';
