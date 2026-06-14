"use client";
import type { ComponentType, ReactNode } from "react";
import { ArrowLeft, LogIn, Mail, UserPlus, X } from "lucide-react";
import type { AuthDialogStep } from "./authDialogStep";
import { UserSayHiLottie } from "@/components/ui/lottie";
import { authDialog } from "@/lib/styles";
import { cn } from "@/lib/core/utils";
export const AUTH_DIALOG_PANEL_CLASS = authDialog.panel;
export const AUTH_DIALOG_PANEL_SCROLL_CLASS = authDialog.panelScroll;
export const AUTH_DIALOG_BACKDROP_CLASS = authDialog.backdrop;
export const AUTH_DIALOG_CONTENT_CLASS = authDialog.content;
export const AUTH_DIALOG_BODY_CLASS = authDialog.body;
export function authSocialButtonClassNames(disabled: boolean): string {
  return disabled ? authDialog.socialBtnDisabled : authDialog.socialBtnEnabled;
}
export function authInputClassName(extra?: string): string {
  return cn(authDialog.input, extra);
}
export function getAuthDialogBackConfig(
  step: AuthDialogStep,
  stepBeforeVerify: AuthDialogStep,
): {
  show: boolean;
  label: string;
  target: AuthDialogStep | null;
} {
  switch (step) {
    case "welcome":
      return { show: false, label: "Back", target: null };
    case "login-email":
      return { show: true, label: "Back", target: "welcome" };
    case "signup":
      return { show: true, label: "Back", target: "welcome" };
    case "signup-email":
      return { show: true, label: "Back", target: "signup" };
    case "verify-email":
      return {
        show: true,
        label:
          stepBeforeVerify === "login-email" ||
          stepBeforeVerify === "signup-email"
            ? "Change email"
            : "Back",
        target: stepBeforeVerify,
      };
    default:
      return { show: false, label: "Back", target: null };
  }
}
export function AuthDialogTopBar({
  showBack,
  backLabel = "Back",
  onBack,
  onClose,
  closeDisabled = false,
}: Readonly<{
  showBack: boolean;
  backLabel?: string;
  onBack?: () => void;
  onClose: () => void;
  closeDisabled?: boolean;
}>) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 px-2 pb-2 pt-2">
      <div className="flex min-w-9 items-center justify-start">
        {showBack && onBack != null ? (
          <button
            type="button"
            onClick={onBack}
            className={cn(authDialog.chromeBtn, "gap-1 px-2.5 w-auto min-w-9")}
            aria-label={backLabel}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {backLabel}
            </span>
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className={authDialog.chromeBtn}
        aria-label="Close"
      >
        <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
type AuthStepHeaderVariant = "welcome" | "login" | "signup" | "verify";
const HEADER_META: Record<
  AuthStepHeaderVariant,
  {
    icon: ComponentType<{
      className?: string;
    }>;
    label: string;
  }
> = {
  welcome: { icon: LogIn, label: "Sign in" },
  login: { icon: LogIn, label: "Email sign in" },
  signup: { icon: UserPlus, label: "Create account" },
  verify: { icon: Mail, label: "Verify" },
};
export function AuthWelcomeHero({
  title = "Welcome.",
  titleId = "auth-dialog-title",
}: Readonly<{
  title?: string;
  titleId?: string;
}>) {
  return (
    <header className="mb-4 flex flex-col items-center text-center">
      <div className="relative flex items-center justify-center" aria-hidden>
        <UserSayHiLottie autoplay size={128} className="relative z-[1]" />
      </div>
      <h2
        id={titleId}
        className="mt-2 bg-gradient-to-br from-card-foreground via-card-foreground to-primary bg-clip-text font-black italic uppercase tracking-tighter text-transparent text-2xl"
      >
        {title}
      </h2>
    </header>
  );
}
export function AuthStepHeader({
  title,
  titleId = "auth-dialog-title",
  variant = "welcome",
}: Readonly<{
  title: ReactNode;
  titleId?: string;
  variant?: AuthStepHeaderVariant;
}>) {
  const Icon = HEADER_META[variant].icon;
  return (
    <header className="mb-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <h2
          id={titleId}
          className="font-black italic uppercase tracking-tighter text-card-foreground text-lg leading-tight"
        >
          {title}
        </h2>
      </div>
    </header>
  );
}
export function AuthSocialGrid({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <div className="grid grid-cols-2 gap-1.5">{children}</div>;
}
export function AuthOrDivider() {
  return (
    <div className="relative my-3" role="presentation">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-muted-foreground/20" />
      </div>

      <div className="relative flex justify-center">
        <span className="relative z-10  bg-card px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Or
        </span>
      </div>
    </div>
  );
}
export function AuthSocialGroup({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AuthSocialGrid>{children}</AuthSocialGrid>;
}
export function AuthEmailOutlineButton({
  label,
  onClick,
  disabled = false,
}: Readonly<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 border-2 border-primary/45",
        "bg-primary/12 px-4 py-3 text-[10px] font-black uppercase leading-none tracking-[0.1em]",
        "text-card-foreground transition-[border-color,background-color,transform]",
        "hover:border-primary hover:bg-primary/16 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-45",
      )}
    >
      <Mail className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="text-center">{label}</span>
    </button>
  );
}
export function AuthInboxCallout({
  label,
  email,
}: Readonly<{
  label: string;
  email: string;
}>) {
  return (
    <div className="mt-2 border-l-4 border-l-primary bg-background/20 px-3 py-2">
      <p className="font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 break-all text-xs font-semibold text-card-foreground">
        {email}
      </p>
    </div>
  );
}
