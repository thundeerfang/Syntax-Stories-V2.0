"use client";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Award, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  DIALOG_FOOTER_TOP_BORDER,
  DIALOG_TITLE_BAR_BOTTOM_BORDER,
  DIALOG_TITLE_ICON_BOX_CLASS,
  DIALOG_Z_INDEX,
} from "@/components/ui/dialog/dialogs";
import { fireConfettiSideCannons } from "@/lib/core/confettiSideCannons";
import { cn } from "@/lib/core/utils";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { AchievementUnlockDto } from "@/contracts/achievementsApi";
import { AchievementDialogGrid } from "./AchievementDialogGrid";
export type AchievementUnlockDialogProps = Readonly<{
  unlock: AchievementUnlockDto | null;
  onClose: () => void;
}>;
import { achievement } from "@/lib/styles";
export function AchievementUnlockDialog({
  unlock,
  onClose,
}: AchievementUnlockDialogProps) {
  const open = Boolean(unlock);
  const titleId = useId();
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => fireConfettiSideCannons(3200), 120);
    return () => window.clearTimeout(t);
  }, [open, unlock?.id]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (typeof document === "undefined") return null;
  const pct =
    unlock && unlock.target > 0
      ? Math.min(100, (unlock.current / unlock.target) * 100)
      : 0;
  return createPortal(
    <AnimatePresence>
      {unlock ? (
        <motion.div
          key={unlock.id}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: DIALOG_Z_INDEX }}
        >
          <button
            type="button"
            className={achievement.unlockBackdrop}
            aria-label="Close achievement dialog"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={achievement.unlockPanel}
          >
            <header
              className={cn(
                "relative shrink-0 overflow-hidden px-5 py-4 pr-14 sm:px-6",
                DIALOG_TITLE_BAR_BOTTOM_BORDER,
              )}
            >
              <AchievementDialogGrid variant="header" />
              <div className="relative z-10 flex items-center gap-3">
                <div className={DIALOG_TITLE_ICON_BOX_CLASS}>
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                    Achievement unlocked
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Syntax Stories
                  </p>
                </div>
              </div>
            </header>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-3.5 z-30 flex size-9 shrink-0 items-center justify-center border-2 border-border bg-card/95 text-muted-foreground shadow transition-colors hover:border-primary hover:text-foreground sm:right-5 sm:top-4"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>

            <div className="relative min-h-[15.5rem] overflow-hidden px-5 py-8 sm:px-6 sm:py-9">
              <AchievementDialogGrid variant="hero" />

              <div className="relative z-10 mx-auto flex max-w-[18rem] flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.6, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 22,
                    delay: 0.05,
                  }}
                  className="mb-4 flex size-16 items-center justify-center border-2 border-primary bg-primary/15 text-primary shadow-[3px_3px_0_0] shadow-primary/25"
                >
                  <Award className="size-8" strokeWidth={2.25} aria-hidden />
                </motion.div>

                <h2
                  id={titleId}
                  className="font-mono text-xl font-black uppercase leading-tight tracking-tight text-foreground sm:text-2xl"
                >
                  {unlock.title}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                  {unlock.description}
                </p>

                <div className="mt-5 inline-flex items-baseline gap-1 border-2 border-primary/40 bg-primary/10 px-4 py-2 shadow-sm">
                  <span className="text-3xl font-black italic leading-none text-primary">
                    +{unlock.points}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                    pts
                  </span>
                </div>

                <div className="mt-6 w-full max-w-[14rem] space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Progress</span>
                    <span>
                      {unlock.current}/{unlock.target}
                    </span>
                  </div>
                  <div className="h-2 border-2 border-border bg-muted/40">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.55,
                        ease: "easeOut",
                        delay: 0.15,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <footer
              className={cn(
                "relative shrink-0 bg-muted/25 px-5 py-4 sm:px-6",
                DIALOG_FOOTER_TOP_BORDER,
              )}
            >
              <Link
                href="/achievements"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 border-2 border-border bg-card py-3 text-[10px] font-black uppercase tracking-widest text-foreground shadow transition-all hover:translate-x-px hover:translate-y-px hover:border-primary hover:shadow-none"
              >
                View all achievements
              </Link>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
