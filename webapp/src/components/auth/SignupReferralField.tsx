"use client";
import { cn } from "@/lib/core/utils";
import { authInputClassName } from "./authDialogUi";
import type { ReferralValidationState } from "@/hooks/useSignupReferralCode";
import type { InviteResolveValid } from "@/api/invite";
type SignupReferralFieldProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  validationState: ReferralValidationState;
  referrer: InviteResolveValid | null;
  errorMessage: string | null;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
}>;
export function SignupReferralField({
  value,
  onChange,
  validationState,
  referrer,
  errorMessage,
  disabled = false,
  id = "auth-signup-referral",
  compact = false,
}: SignupReferralFieldProps) {
  const showError =
    (validationState === "format-error" || validationState === "invalid") &&
    errorMessage;
  return (
    <div className={cn("space-y-1.5", compact && "text-center")}>
      <label htmlFor={id} className="sr-only">
        Referral code
      </label>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="👥  Enter referral code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={16}
        className={cn(
          authInputClassName("text-left placeholder:text-left"),
          compact && "mt-2 border-border/70 bg-background/30 text-left text-xs",
          showError && "border-destructive/70 focus-visible:ring-destructive/40",
          validationState === "valid" &&
            "border-emerald-600/50 focus-visible:ring-emerald-600/30",
        )}
        aria-invalid={showError ? true : undefined}
        aria-describedby={
          showError ? `${id}-error` : referrer ? `${id}-ok` : undefined
        }
      />
      {validationState === "checking" && (
        <p className="ml-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Checking code…
        </p>
      )}
      {showError && (
        <p
          id={`${id}-error`}
          className="ml-1 text-[10px] font-bold uppercase tracking-widest text-destructive"
        >
          {errorMessage}
        </p>
      )}
      {validationState === "valid" && referrer && (
        <p
          id={`${id}-ok`}
          className="ml-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400"
        >
          Invited by {referrer.fullName || referrer.username}
        </p>
      )}
    </div>
  );
}
