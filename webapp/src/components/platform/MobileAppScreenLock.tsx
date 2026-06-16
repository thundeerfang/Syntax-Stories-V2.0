"use client";

import { useEffect, useId, useLayoutEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { GooglePlayIcon } from "@/components/icons/SocialProviderIcons";
import { BlockShadowButton } from "@/components/ui/button";
import { ABOUT_PAGE_SEED } from "@/lib/marketing/aboutPage.seed";
import {
  applyMobileBrowserLock,
  isMobileBrowser,
  subscribeMobileBrowserLock,
} from "@/lib/dom/isMobileBrowser";
import { cn } from "@/lib/core/utils";
import { useScrollLock } from "@/hooks/useScrollLock";
import { MOBILE_APP_SCREEN_LOCK_Z } from "@/variable";

const APP = ABOUT_PAGE_SEED.mobileApp;

function getLockSnapshot(): boolean {
  return isMobileBrowser();
}

function getServerLockSnapshot(): boolean {
  return false;
}

export function MobileAppScreenLock() {
  const titleId = useId();
  const descId = useId();
  const reduceMotion = useReducedMotion();
  const active = useSyncExternalStore(
    subscribeMobileBrowserLock,
    getLockSnapshot,
    getServerLockSnapshot,
  );

  useLayoutEffect(() => {
    applyMobileBrowserLock(active);
  }, [active]);

  useScrollLock(active);

  useEffect(() => {
    if (!active) return;
    const blockKeys = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    document.addEventListener("keydown", blockKeys, true);
    return () => document.removeEventListener("keydown", blockKeys, true);
  }, [active]);

  const transition = reduceMotion
    ? { duration: 0.08 }
    : { duration: 0.12, ease: [0.33, 1, 0.68, 1] as const };

  if (!active) return null;

  const overlay = (
    <div
      data-ss-mobile-lock
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 bg-transparent pointer-events-auto touch-none"
      style={{ zIndex: MOBILE_APP_SCREEN_LOCK_Z }}
    >
      <div className="grid-bg flex min-h-[100dvh] flex-col items-center justify-center px-5 py-8">
        <motion.div
          initial={
            reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={transition}
          className={cn(
            "relative z-[1] flex w-full max-w-sm flex-col items-center border-[3px] border-border bg-card p-6 text-center shadow-[6px_6px_0_0_var(--border)] sm:p-8",
          )}
        >
          <img
            src={APP.iconSrc}
            alt=""
            width={72}
            height={72}
            className="mb-5 size-[4.5rem] border-2 border-border object-cover shadow-[3px_3px_0_0_var(--border)]"
          />

          <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.28em] text-primary">
            Desktop browsers only
          </p>
          <h2
            id={titleId}
            className="mb-2 font-sans text-xl font-black uppercase tracking-tight text-foreground"
          >
            Not available on mobile web
          </h2>
          <p
            id={descId}
            className="mb-6 max-w-[19rem] text-sm font-medium leading-relaxed text-muted-foreground"
          >
            Syntax Stories on the web is for PC browsers. Visit from a desktop,
            or get the {APP.name} app on Google Play.
          </p>

          <BlockShadowButton
            href={APP.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            size="md"
            fullWidth
            className="gap-2.5"
          >
            <GooglePlayIcon className="size-5 shrink-0" />
            <span className="flex min-w-0 flex-col items-start text-left leading-tight">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-90">
                Download on
              </span>
              <span className="text-sm font-black uppercase tracking-wide">
                Google Play
              </span>
            </span>
          </BlockShadowButton>
        </motion.div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
