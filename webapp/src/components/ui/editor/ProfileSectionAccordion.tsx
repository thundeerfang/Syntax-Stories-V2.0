"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, FolderGit2, Code2, ChevronRight, Wrench } from "lucide-react";
import { cn } from "@/lib/core/utils";
export type ProfileSectionVariant =
  | "certification"
  | "project"
  | "openSource"
  | "mySetup";
const VARIANT_CONFIG: Record<
  ProfileSectionVariant,
  {
    icon: React.ComponentType<{
      className?: string;
    }>;
    title: string;
    borderColor?: string;
  }
> = {
  certification: {
    icon: Award,
    title: "Certifications",
    borderColor: "border-l-amber-500",
  },
  project: {
    icon: FolderGit2,
    title: "Projects",
    borderColor: "border-l-blue-500",
  },
  openSource: {
    icon: Code2,
    title: "Open Source",
    borderColor: "border-l-violet-500",
  },
  mySetup: {
    icon: Wrench,
    title: "My Setup",
    borderColor: "border-l-primary",
  },
};
export interface ProfileSectionAccordionProps {
  variant: ProfileSectionVariant;
  title?: string;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}
export function ProfileSectionAccordion({
  variant,
  title: titleProp,
  subtitle,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  children,
  headerAction,
}: Readonly<ProfileSectionAccordionProps>) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled =
    controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const handleToggle = () => {
    if (isControlled) {
      onOpenChange(!open);
    } else {
      setInternalOpen((v) => !v);
    }
  };
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const title = titleProp ?? config.title;
  return (
    <div className={cn("retro-card-lg overflow-hidden", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex w-full items-center justify-between gap-3 border-b-4 border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/30",
          undefined,
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-card text-primary">
            <Icon className="size-5" />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground truncate">
              {title}
            </span>
            {subtitle != null && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerAction}
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-300 ease-out",
              open && "rotate-90",
            )}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-4 border-t-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
