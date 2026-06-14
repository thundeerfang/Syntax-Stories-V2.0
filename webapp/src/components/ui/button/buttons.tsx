import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { Loader2 } from "lucide-react";
import { SHADOW_BLOCK_BUTTON, SHADOW_GHOST_HOVER } from "@/lib/core/shadows";
import { cn } from "@/lib/core/utils";
const FOCUS_RING_PRIMARY =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const FOCUS_RING_FOREGROUND =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const LINK_NO_UNDERLINE = "no-underline [text-decoration-line:none]";
const LINK_TONE_CLASS: Record<string, string> = {
  primary:
    "!text-primary-foreground visited:!text-primary-foreground hover:!text-primary-foreground",
  secondary: "!text-foreground visited:!text-foreground hover:!text-foreground",
  outline: "!text-foreground visited:!text-foreground hover:!text-foreground",
  ghost: "!text-foreground visited:!text-foreground hover:!text-foreground",
  danger: "!text-destructive visited:!text-destructive hover:!text-destructive",
};
function resolveLinkRel(target?: string, rel?: string): string | undefined {
  return rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);
}
export function renderButtonChildren(
  loading: boolean,
  spinnerClassName: string,
  children: ReactNode,
) {
  if (loading) {
    return (
      <>
        <Loader2
          className={cn("shrink-0 animate-spin", spinnerClassName)}
          aria-hidden
        />
        <span className="sr-only">Loading</span>
      </>
    );
  }
  return children;
}
type ButtonLinkProps = Readonly<{
  ref: Ref<HTMLAnchorElement>;
  href: string;
  className: string;
  tone: string;
  loading: boolean;
  spinnerClassName: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  download?: string;
  props: AnchorHTMLAttributes<HTMLAnchorElement>;
}>;
function ButtonLink({
  ref,
  href,
  className,
  tone,
  loading,
  spinnerClassName,
  children,
  target,
  rel,
  download,
  props,
}: ButtonLinkProps) {
  return (
    <a
      ref={ref}
      href={href}
      data-ss-button-link
      target={target}
      rel={resolveLinkRel(target, rel)}
      download={download}
      className={cn(className, LINK_NO_UNDERLINE, LINK_TONE_CLASS[tone])}
      {...props}
    >
      {renderButtonChildren(loading, spinnerClassName, children)}
    </a>
  );
}
const RETRO_ICON_SIZE_CLASS = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
} as const;
type RetroIconVariant = "default" | "primary" | "ghost" | "destructive";
type RetroIconSize = keyof typeof RETRO_ICON_SIZE_CLASS;
function retroIconSurfaceClass(
  variant: RetroIconVariant = "default",
  size: RetroIconSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center border-2 transition-colors",
    FOCUS_RING_PRIMARY,
    "disabled:pointer-events-none disabled:opacity-50",
    {
      "border-border bg-card text-foreground shadow hover:border-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none":
        variant === "default",
      "border-primary bg-primary text-primary-foreground shadow hover:brightness-110":
        variant === "primary",
      "border-transparent bg-transparent text-foreground hover:border-border hover:bg-muted/50":
        variant === "ghost",
      "border-destructive/60 bg-destructive/20 text-destructive hover:bg-destructive/35":
        variant === "destructive",
    },
    RETRO_ICON_SIZE_CLASS[size],
    className,
  );
}
function retroCardFooterClass(variant: "default" | "danger"): string {
  return cn(
    "flex flex-1 items-center justify-center gap-1 border-2 py-2.5 font-mono text-[9px] font-black uppercase tracking-wide transition-[background-color,border-color] duration-300 ease-out",
    variant === "danger"
      ? "border-destructive/60 bg-destructive/20 text-destructive hover:bg-destructive/35 dark:bg-red-500/12 dark:text-red-300 dark:hover:bg-red-500/22"
      : "border-border bg-muted/40 text-foreground hover:bg-muted/70 dark:border-border/50 dark:bg-white/10 dark:hover:bg-white/18",
  );
}
export interface ButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "href">,
    Pick<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      "target" | "rel" | "download"
    > {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  href?: string;
  loading?: boolean;
}
const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      href,
      type = "button",
      disabled,
      loading = false,
      target,
      rel,
      download,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const spinnerClassName =
      size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
    const cls = cn(
      "inline-flex items-center justify-center gap-2 text-center font-medium  border-2 border-border transition-all",
      FOCUS_RING_FOREGROUND,
      "disabled:pointer-events-none disabled:opacity-50",
      {
        "bg-primary text-primary-foreground hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 shadow active:shadow-none":
          variant === "primary",
        "bg-background text-foreground border-border hover:bg-muted":
          variant === "secondary",
        "bg-transparent text-foreground border-transparent hover:bg-muted":
          variant === "ghost",
        "bg-transparent text-foreground border-border hover:bg-muted":
          variant === "outline",
      },
      {
        "h-8 px-3 text-sm": size === "sm",
        "h-10 px-4 text-sm": size === "md",
        "h-12 px-6 text-base": size === "lg",
      },
      className,
    );
    if (href) {
      return (
        <ButtonLink
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          className={cls}
          tone={variant}
          loading={loading}
          spinnerClassName={spinnerClassName}
          target={target}
          rel={rel}
          download={download}
          props={props as AnchorHTMLAttributes<HTMLAnchorElement>}
        >
          {children}
        </ButtonLink>
      );
    }
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cls}
        {...props}
      >
        {renderButtonChildren(loading, spinnerClassName, children)}
      </button>
    );
  },
);
Button.displayName = "Button";
export { Button };
export type BlockShadowButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger";
export type BlockShadowButtonSize = "sm" | "md" | "lg";
export type BlockShadowDepth = "md" | "sm";
export type BlockShadowButtonClassOptions = {
  variant?: BlockShadowButtonVariant;
  size?: BlockShadowButtonSize;
  shadow?: BlockShadowDepth;
  fullWidth?: boolean;
  className?: string;
};
export function blockShadowButtonClassNames(
  options: BlockShadowButtonClassOptions = {},
): string {
  const {
    variant = "primary",
    size = "md",
    fullWidth = false,
    className,
  } = options;
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2  border-2 border-border font-black uppercase tracking-widest",
    "transition-[transform,box-shadow] duration-150 ease-out",
    FOCUS_RING_PRIMARY,
    SHADOW_BLOCK_BUTTON,
    {
      "bg-primary text-primary-foreground": variant === "primary",
      "bg-background text-foreground": variant === "secondary",
      "bg-transparent text-foreground": variant === "outline",
      "border-destructive/70 bg-destructive/15 text-destructive hover:bg-destructive/25":
        variant === "danger",
    },
    {
      "px-3 py-2 text-[10px]": size === "sm",
      "px-4 py-3 text-xs": size === "md",
      "px-6 py-3.5 text-sm": size === "lg",
    },
    fullWidth && "w-full",
    className,
  );
}
export type BlockShadowButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  BlockShadowButtonClassOptions &
  Pick<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "target" | "rel" | "download"
  > & {
    className?: string;
    loading?: boolean;
    href?: string;
  };
export const BlockShadowButton = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  BlockShadowButtonProps
>(
  (
    {
      variant = "primary",
      size = "md",
      shadow = "md",
      fullWidth = false,
      className,
      type = "button",
      disabled,
      loading = false,
      href,
      target,
      rel,
      download,
      children,
      ...props
    },
    ref,
  ) => {
    const spinnerClassName =
      size === "sm" ? "size-3.5" : size === "lg" ? "size-4" : "size-3.5";
    const cls = cn(
      blockShadowButtonClassNames({
        variant,
        size,
        shadow,
        fullWidth,
        className,
      }),
      "disabled:pointer-events-none disabled:opacity-50",
    );
    if (href) {
      return (
        <ButtonLink
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          className={cls}
          tone={variant}
          loading={loading}
          spinnerClassName={spinnerClassName}
          target={target}
          rel={rel}
          download={download}
          props={props as AnchorHTMLAttributes<HTMLAnchorElement>}
        >
          {children}
        </ButtonLink>
      );
    }
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cls}
        {...props}
      >
        {renderButtonChildren(loading, spinnerClassName, children)}
      </button>
    );
  },
);
BlockShadowButton.displayName = "BlockShadowButton";
export type GhostOutlineButtonSize = "sm" | "md" | "lg";
export type GhostOutlineButtonClassOptions = {
  size?: GhostOutlineButtonSize;
  fullWidth?: boolean;
  className?: string;
};
export function ghostOutlineButtonClassNames(
  options: GhostOutlineButtonClassOptions = {},
): string {
  const { size = "md", fullWidth = false, className } = options;
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2  border-2 border-border bg-card text-foreground",
    "transition-[box-shadow,border-color,color] duration-150 ease-out",
    SHADOW_GHOST_HOVER,
    "active:border-primary focus-visible:outline-none focus-visible:border-primary",
    {
      "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide":
        size === "sm",
      "px-5 py-2.5 text-xs font-bold uppercase tracking-wide": size === "md",
      "px-6 py-4 text-xs font-black uppercase tracking-widest": size === "lg",
    },
    fullWidth && "w-full",
    className,
  );
}
export type GhostOutlineButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  GhostOutlineButtonClassOptions & {
    className?: string;
    loading?: boolean;
  };
export const GhostOutlineButton = forwardRef<
  HTMLButtonElement,
  GhostOutlineButtonProps
>(
  (
    {
      size = "md",
      fullWidth = false,
      className,
      type = "button",
      disabled,
      loading = false,
      children,
      ...props
    },
    ref,
  ) => {
    const spinnerClassName = size === "lg" ? "size-4" : "size-3.5";
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          ghostOutlineButtonClassNames({ size, fullWidth, className }),
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        {...props}
      >
        {renderButtonChildren(loading, spinnerClassName, children)}
      </button>
    );
  },
);
GhostOutlineButton.displayName = "GhostOutlineButton";
export type RetroToolbarButtonProps = Readonly<{
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "primary";
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}>;
export function RetroToolbarButton({
  label,
  href,
  onClick,
  variant = "default",
  className,
  ariaLabel,
  disabled = false,
}: RetroToolbarButtonProps) {
  return (
    <BlockShadowButton
      href={href}
      type="button"
      variant={variant === "primary" ? "primary" : "outline"}
      size="sm"
      className={cn("h-[42px] px-3", className)}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {label}
    </BlockShadowButton>
  );
}
export type RetroFilterPillProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  Readonly<{
    active?: boolean;
    className?: string;
    children: ReactNode;
  }>;
export const RetroFilterPill = forwardRef<
  HTMLButtonElement,
  RetroFilterPillProps
>(({ active = false, className, children, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "inline-flex shrink-0 items-center gap-2 border-2 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest transition-colors",
      FOCUS_RING_PRIMARY,
      active
        ? "border-primary bg-primary text-primary-foreground shadow"
        : "border-border bg-card text-foreground hover:bg-muted/50",
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
RetroFilterPill.displayName = "RetroFilterPill";
export type RetroIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  Readonly<{
    variant?: RetroIconVariant;
    size?: RetroIconSize;
    className?: string;
    children: ReactNode;
  }>;
export const RetroIconButton = forwardRef<
  HTMLButtonElement,
  RetroIconButtonProps
>(
  (
    {
      variant = "default",
      size = "md",
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={retroIconSurfaceClass(variant, size, className)}
      {...props}
    >
      {children}
    </button>
  ),
);
RetroIconButton.displayName = "RetroIconButton";
export type RetroIconLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "className"
> &
  Readonly<{
    size?: RetroIconSize;
    className?: string;
    children: ReactNode;
  }>;
export function RetroIconLink({
  size = "lg",
  className,
  children,
  ...props
}: RetroIconLinkProps) {
  return (
    <a className={retroIconSurfaceClass("default", size, className)} {...props}>
      {children}
    </a>
  );
}
export type RetroMenuItemButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  Readonly<{
    variant?: "default" | "destructive";
    className?: string;
    children: ReactNode;
  }>;
export const RetroMenuItemButton = forwardRef<
  HTMLButtonElement,
  RetroMenuItemButtonProps
>(
  (
    { variant = "default", className, children, type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wide",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
          : "hover:bg-muted/60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
RetroMenuItemButton.displayName = "RetroMenuItemButton";
export type RetroStatusDotProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  Readonly<{
    active?: boolean;
    className?: string;
  }>;
export const RetroStatusDot = forwardRef<
  HTMLButtonElement,
  RetroStatusDotProps
>(({ active = false, className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "relative shrink-0 border-2 transition-colors disabled:opacity-100",
      "size-2.5",
      active
        ? "pointer-events-none cursor-default border-purple-600 bg-purple-600 shadow"
        : "border-muted-foreground/35 bg-transparent hover:border-purple-500 disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
RetroStatusDot.displayName = "RetroStatusDot";
export type RetroCardFooterButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel" | "download"> &
  Readonly<{
    variant?: "default" | "danger";
    href?: string;
    className?: string;
    children: ReactNode;
  }>;
export const RetroCardFooterButton = forwardRef<
  HTMLButtonElement,
  RetroCardFooterButtonProps
>(
  (
    {
      variant = "default",
      href,
      target,
      rel,
      download,
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const cls = cn(retroCardFooterClass(variant), className);
    if (href) {
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={resolveLinkRel(target, rel)}
          download={download}
          className={cls}
          {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }
    return (
      <button ref={ref} type={type} className={cls} {...props}>
        {children}
      </button>
    );
  },
);
RetroCardFooterButton.displayName = "RetroCardFooterButton";
export type RetroCardActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  Readonly<{
    className?: string;
    children: ReactNode;
  }>;
export const RetroCardActionButton = forwardRef<
  HTMLButtonElement,
  RetroCardActionButtonProps
>(({ className, children, ...props }, ref) => (
  <RetroIconButton
    ref={ref}
    size="sm"
    className={cn("text-muted-foreground hover:text-foreground", className)}
    {...props}
  >
    {children}
  </RetroIconButton>
));
RetroCardActionButton.displayName = "RetroCardActionButton";
export type RetroEmptyStateActionProps = Readonly<{
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "default";
  icon?: ReactNode;
  ariaLabel?: string;
}>;
export function RetroEmptyStateAction({
  label,
  href,
  onClick,
  variant = "default",
  icon,
  ariaLabel,
}: RetroEmptyStateActionProps) {
  const blockVariant = variant === "primary" ? "primary" : "outline";
  const padClass = variant === "primary" ? "px-5 py-2.5" : "px-4 py-2";
  return (
    <BlockShadowButton
      href={href}
      type="button"
      variant={blockVariant}
      size="sm"
      className={padClass}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {icon}
      {label}
    </BlockShadowButton>
  );
}
export type RetroDialogCloseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  Readonly<{
    mode?: "title" | "legacy";
    className?: string;
    children: ReactNode;
  }>;
export const RetroDialogCloseButton = forwardRef<
  HTMLButtonElement,
  RetroDialogCloseButtonProps
>(({ mode = "title", className, children, type = "button", ...props }, ref) => (
  <RetroIconButton
    ref={ref}
    type={type}
    variant="default"
    size="md"
    className={cn(
      "absolute z-30 text-muted-foreground hover:text-foreground",
      mode === "title"
        ? "right-4 top-3.5 sm:right-6 sm:top-4"
        : "right-2 top-2",
      className,
    )}
    {...props}
  >
    {children}
  </RetroIconButton>
));
RetroDialogCloseButton.displayName = "RetroDialogCloseButton";
