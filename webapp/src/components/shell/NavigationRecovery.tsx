"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { consumeOAuthNavigationPending } from "@/lib/auth/oauthNavigation";
import { dispatchRouteRestore } from "@/lib/shell/routeRestore";
import { useAuthStore } from "@/store/auth";
export function NavigationRecovery() {
  const router = useRouter();
  const recoverScheduledRef = useRef(false);
  useEffect(() => {
    const recover = () => {
      if (recoverScheduledRef.current) return;
      recoverScheduledRef.current = true;
      requestAnimationFrame(() => {
        recoverScheduledRef.current = false;
        consumeOAuthNavigationPending();
        const { isHydrated, isLoading } = useAuthStore.getState();
        if (isHydrated && isLoading) {
          useAuthStore.setState({ isLoading: false });
        }
        dispatchRouteRestore();
        router.refresh();
      });
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted || consumeOAuthNavigationPending()) recover();
    };
    const onPopState = () => recover();
    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        consumeOAuthNavigationPending()
      )
        recover();
    };
    if (consumeOAuthNavigationPending()) recover();
    globalThis.addEventListener("pageshow", onPageShow);
    globalThis.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      globalThis.removeEventListener("pageshow", onPageShow);
      globalThis.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);
  return null;
}
