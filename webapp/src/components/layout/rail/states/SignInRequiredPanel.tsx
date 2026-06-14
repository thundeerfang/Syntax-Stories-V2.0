"use client";
import type { LucideIcon } from "lucide-react";
import { LogIn } from "lucide-react";
import { useAuthDialogStore } from "@/store/authDialog";
import { RailFeedEmptyState } from "./RailFeedEmptyState";
export type SignInRequiredPanelProps = Readonly<{
  icon?: LucideIcon;
  title?: string;
  description: string;
  className?: string;
}>;
const DEFAULT_TITLE = "Sign in to continue";
const DEFAULT_DESCRIPTION =
  "You need to be logged in before continuing to this page.";
export function SignInRequiredPanel({
  icon: Icon = LogIn,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  className,
}: SignInRequiredPanelProps) {
  const openAuth = useAuthDialogStore((s) => s.open);
  return (
    <RailFeedEmptyState
      icon={Icon}
      title={title}
      description={description}
      className={className}
      actions={[
        {
          label: "Sign in",
          onClick: () => openAuth("login"),
          variant: "primary",
          ariaLabel: "Sign in to continue",
        },
      ]}
    />
  );
}
