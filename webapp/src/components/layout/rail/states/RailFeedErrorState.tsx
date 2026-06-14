"use client";
import { AlertCircle, WifiOff } from "lucide-react";
import { BlockShadowButton } from "@/components/ui/button";
import { BlogApiConnectionError } from "@/lib/api/blogAuthFetch";
import { cn } from "@/lib/core/utils";
import { RailStatusPanel } from "./RailStatusPanel";
export function resolveFeedErrorPresentation(
  error: unknown,
  defaults: Readonly<{
    title: string;
    connectionTitle?: string;
    connectionDescription?: string;
    fallbackDescription?: string;
  }>,
): Readonly<{
  title: string;
  description: string;
  isConnection: boolean;
}> {
  const isConnection = error instanceof BlogApiConnectionError;
  if (isConnection) {
    return {
      title: defaults.connectionTitle ?? "Cannot connect to the server",
      description:
        defaults.connectionDescription ??
        "Check your connection and try again.",
      isConnection,
    };
  }
  const detail =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : (defaults.fallbackDescription ??
        "Something went wrong. Please try again.");
  return {
    title: defaults.title,
    description: detail,
    isConnection,
  };
}
export type RailFeedErrorStateProps = Readonly<{
  title: string;
  description?: string;
  error?: unknown | null;
  isConnectionError?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: "panel" | "inline";
}>;
function ErrorIconTile({
  isConnection,
  compact,
}: Readonly<{
  isConnection: boolean;
  compact: boolean;
}>) {
  const Icon = isConnection ? WifiOff : AlertCircle;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border-2 border-destructive/45 bg-destructive/10 text-destructive",
        compact ? "size-12" : "size-16 shadow-sm",
      )}
      aria-hidden
    >
      <Icon className={compact ? "size-6" : "size-8"} strokeWidth={2.25} />
    </span>
  );
}
export function RailFeedErrorState({
  title,
  description,
  error = null,
  isConnectionError,
  onRetry,
  retryLabel = "Retry",
  className,
  variant = "panel",
}: RailFeedErrorStateProps) {
  const resolved = resolveFeedErrorPresentation(error, {
    title,
    fallbackDescription: description,
  });
  const isConn = isConnectionError ?? resolved.isConnection;
  const headline = error != null ? resolved.title : title;
  const body =
    description ?? (error != null ? resolved.description : undefined);
  const isInline = variant === "inline";
  const footer = onRetry ? (
    <BlockShadowButton
      type="button"
      variant="outline"
      size="sm"
      onClick={onRetry}
    >
      {retryLabel}
    </BlockShadowButton>
  ) : undefined;
  return (
    <RailStatusPanel
      role="alert"
      icon={<ErrorIconTile isConnection={isConn} compact={isInline} />}
      title={headline}
      description={body}
      footer={footer}
      tone="destructive"
      layout={isInline ? "inline" : "centered"}
      className={className}
    />
  );
}
