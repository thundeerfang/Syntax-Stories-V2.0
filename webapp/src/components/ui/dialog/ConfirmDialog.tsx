"use client";
import React, { useId, useRef } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { renderButtonChildren } from "../button";
import { Dialog, DIALOG_Z_INDEX_STACKED } from "./dialogs";
import { cn } from "@/lib/core/utils";
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  description?: ReactNode;
  titleId?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  confirming?: boolean;
  closeOnConfirm?: boolean;
  hideCancel?: boolean;
  showCloseButton?: boolean;
  defaultFocusConfirm?: boolean;
  panelClassName?: string;
  children?: ReactNode;
}
type CenteredTone = "danger" | "warning";
const CENTERED_TONE: Record<
  CenteredTone,
  Readonly<{
    panelBorder: string;
    gradient: string;
    iconWrap: string;
    button: string;
    Icon: typeof Trash2;
  }>
> = {
  danger: {
    panelBorder: "border-destructive/35 dark:border-destructive/40",
    gradient:
      "from-destructive/20 via-destructive/10 to-card dark:from-destructive/25 dark:via-destructive/12 dark:to-card",
    iconWrap:
      "border-destructive/40 bg-destructive/15 text-destructive shadow dark:border-destructive/50 dark:bg-destructive/20",
    button:
      "border-destructive bg-destructive text-destructive-foreground hover:brightness-110",
    Icon: Trash2,
  },
  warning: {
    panelBorder: "border-amber-500/45 dark:border-amber-400/50",
    gradient:
      "from-amber-400/30 via-amber-400/14 to-card dark:from-amber-500/22 dark:via-amber-500/11 dark:to-card",
    iconWrap:
      "border-amber-500/55 bg-amber-400/25 text-amber-800 shadow dark:border-amber-400/60 dark:bg-amber-500/20 dark:text-amber-200",
    button:
      "border-amber-600 bg-amber-500 text-amber-950 hover:brightness-105 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950",
    Icon: AlertTriangle,
  },
};
function CenteredConfirmLayout({
  tone,
  titleId,
  title,
  body,
  children,
  confirmLabel,
  busy,
  confirmRef,
  onConfirm,
}: Readonly<{
  tone: CenteredTone;
  titleId: string;
  title: ReactNode;
  body: ReactNode | undefined;
  children: ReactNode | undefined;
  confirmLabel: string;
  busy: boolean;
  confirmRef: React.RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
}>) {
  const styles = CENTERED_TONE[tone];
  const Icon = styles.Icon;
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center sm:px-8 sm:pb-8 sm:pt-12">
      <span
        className={cn(
          "flex size-16 shrink-0 items-center justify-center  border-2",
          styles.iconWrap,
        )}
        aria-hidden
      >
        <Icon className="size-8 stroke-[2.5]" />
      </span>
      <h2
        id={titleId}
        className="mt-5 max-w-[18rem] text-base font-black uppercase tracking-wide text-foreground sm:text-lg"
      >
        {title}
      </h2>
      {body != null ? (
        <p className="mt-3 max-w-[20rem] text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
      {children != null ? (
        <div className="mt-3 max-w-[20rem] text-sm text-muted-foreground">
          {children}
        </div>
      ) : null}
      <button
        ref={confirmRef}
        type="button"
        onClick={onConfirm}
        disabled={busy}
        aria-busy={busy || undefined}
        className={cn(
          "mt-8 w-full border-2 px-6 py-3.5 font-black text-xs uppercase tracking-widest",
          "shadow transition-all",
          "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
          "disabled:pointer-events-none disabled:opacity-60",
          styles.button,
        )}
      >
        {renderButtonChildren(busy, "size-4", confirmLabel)}
      </button>
    </div>
  );
}
function StandardConfirmLayout({
  titleId,
  title,
  body,
  children,
  hideCancel,
  cancelLabel,
  confirmLabel,
  variant,
  busy,
  confirmRef,
  onClose,
  onConfirm,
}: Readonly<{
  titleId: string;
  title: ReactNode;
  body: ReactNode | undefined;
  children: ReactNode | undefined;
  hideCancel: boolean;
  cancelLabel: string;
  confirmLabel: string;
  variant: "danger" | "warning" | "default";
  busy: boolean;
  confirmRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0 flex-1">
        <h2
          id={titleId}
          className="text-base font-black uppercase tracking-wide"
        >
          {title}
        </h2>
        {body != null ? (
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        ) : null}
        {children != null ? (
          <div className="mt-3 text-sm text-muted-foreground">{children}</div>
        ) : null}
      </div>
      <div
        className={cn(
          "flex gap-3 pt-2",
          hideCancel ? "justify-stretch" : "justify-end",
        )}
      >
        {!hideCancel ? (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-5 py-2.5 border-2 border-border bg-background font-bold text-xs uppercase tracking-wide shadow hover:bg-muted/50 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        ) : null}
        <button
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy || undefined}
          className={cn(
            "px-5 py-2.5 border-2 font-black text-xs uppercase tracking-wide shadow active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50",
            hideCancel && "w-full",
            "border-primary bg-primary text-primary-foreground hover:opacity-90",
          )}
        >
          {renderButtonChildren(busy, "size-3.5", confirmLabel)}
        </button>
      </div>
    </div>
  );
}
function centeredToneFromVariant(
  variant: ConfirmDialogProps["variant"],
): CenteredTone | null {
  if (variant === "danger" || variant === "warning") return variant;
  return null;
}
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  description,
  titleId: titleIdProp,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  variant = "danger",
  loading = false,
  confirming = false,
  closeOnConfirm = true,
  hideCancel: hideCancelProp,
  showCloseButton = true,
  defaultFocusConfirm = false,
  panelClassName,
  children,
}: Readonly<ConfirmDialogProps>) {
  const fallbackId = useId();
  const titleId = titleIdProp ?? `confirm-dialog-title-${fallbackId}`;
  const body = message ?? description;
  const busy = loading || confirming;
  const confirmRef = useRef<HTMLButtonElement>(null);
  const centeredTone = centeredToneFromVariant(variant);
  const isCenteredLayout = centeredTone != null;
  const hideCancel = hideCancelProp ?? isCenteredLayout;
  const handleConfirm = () => {
    void Promise.resolve(onConfirm()).then(() => {
      if (closeOnConfirm) onClose();
    });
  };
  React.useEffect(() => {
    if (open && defaultFocusConfirm && confirmRef.current) {
      const t = setTimeout(() => confirmRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open, defaultFocusConfirm]);
  const centeredStyles =
    centeredTone != null ? CENTERED_TONE[centeredTone] : null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      panelClassName={cn(
        "max-w-sm overflow-hidden",
        centeredStyles?.panelBorder,
        panelClassName,
      )}
      contentClassName={cn(isCenteredLayout ? "p-0" : "p-6")}
      legacyCloseContentInset={!isCenteredLayout}
      showCloseButton={showCloseButton}
      zIndex={DIALOG_Z_INDEX_STACKED}
    >
      {isCenteredLayout && centeredTone != null ? (
        <div
          className={cn(
            "min-h-full w-full bg-gradient-to-b",
            centeredStyles!.gradient,
          )}
        >
          <CenteredConfirmLayout
            tone={centeredTone}
            titleId={titleId}
            title={title}
            body={body}
            confirmLabel={confirmLabel}
            busy={busy}
            confirmRef={confirmRef}
            onConfirm={handleConfirm}
          >
            {children}
          </CenteredConfirmLayout>
        </div>
      ) : (
        <StandardConfirmLayout
          titleId={titleId}
          title={title}
          body={body}
          hideCancel={hideCancel}
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          variant={variant}
          busy={busy}
          confirmRef={confirmRef}
          onClose={onClose}
          onConfirm={handleConfirm}
        >
          {children}
        </StandardConfirmLayout>
      )}
    </Dialog>
  );
}
