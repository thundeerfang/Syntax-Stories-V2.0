"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/core/utils";
import { getAltchaChallengeUrl } from "@/api/auth";
import {
  acquireGlobalAltchaBusy,
  releaseGlobalAltchaBusy,
} from "@/components/ui/feedback";
function isAltchaBusyState(state: string): boolean {
  return state === "verifying" || state === "code";
}
function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function readPayloadFromWidget(
  el: HTMLElement & { value?: unknown; payload?: unknown },
  detail?: unknown,
): string | undefined {
  const detailPayload =
    detail != null && typeof detail === "object" && "payload" in detail
      ? (detail as { payload?: unknown }).payload
      : detail;
  return (
    stringValue(detailPayload) ?? stringValue(el.value) ?? stringValue(el.payload)
  );
}
type Props = {
  enabled?: boolean;
  className?: string;
  overlay?: boolean;
  floating?: "auto" | "top" | "bottom";
  floatingAnchor?: string;
  floatingOffset?: number;
  onPayloadChange?: (payload: string | undefined) => void;
};
export function AltchaField({
  enabled = true,
  className,
  overlay = false,
  floating,
  floatingAnchor,
  floatingOffset,
  onPayloadChange,
}: Readonly<Props>) {
  const ref = useRef<
    HTMLElement & {
      reset?: () => void;
      value?: unknown;
      payload?: unknown;
    }
  >(null);
  const altchaHoldRef = useRef(false);
  const prevAltchaStateRef = useRef<string | null>(null);
  const url = getAltchaChallengeUrl();
  const [sdkReady, setSdkReady] = useState(false);
  const [payload, setPayload] = useState("");
  useEffect(() => {
    if (!enabled || !url) return;
    let cancelled = false;
    void import("altcha").then(() => {
      if (!cancelled) setSdkReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, url]);
  useEffect(() => {
    const el = ref.current;
    if (!sdkReady || !el || typeof el.reset !== "function") return;
    setPayload("");
    onPayloadChange?.(undefined);
    el.reset();
  }, [url, enabled, sdkReady, onPayloadChange]);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !url || !sdkReady || !el) return;
    const setResolvedPayload = (next: string | undefined) => {
      setPayload(next ?? "");
      onPayloadChange?.(next);
    };
    const onVerified = (ev: Event) => {
      const ce = ev as CustomEvent<unknown>;
      setResolvedPayload(readPayloadFromWidget(el, ce.detail));
    };
    const onStateChange = (ev: Event) => {
      const ce = ev as CustomEvent<{
        state?: string;
        payload?: unknown;
      }>;
      const state = ce.detail?.state;
      if (!state) return;
      const prev = prevAltchaStateRef.current;
      prevAltchaStateRef.current = state;
      const prevBusy = prev != null && isAltchaBusyState(prev);
      const nextBusy = isAltchaBusyState(state);
      if (!prevBusy && nextBusy) {
        acquireGlobalAltchaBusy();
        altchaHoldRef.current = true;
      } else if (prevBusy && !nextBusy) {
        releaseGlobalAltchaBusy();
        altchaHoldRef.current = false;
      }
      if (state === "verified") {
        setResolvedPayload(readPayloadFromWidget(el, ce.detail));
      } else if (state === "unverified" || state === "error" || state === "expired") {
        setResolvedPayload(undefined);
      }
    };
    el.addEventListener("verified", onVerified);
    el.addEventListener("statechange", onStateChange);
    return () => {
      el.removeEventListener("verified", onVerified);
      el.removeEventListener("statechange", onStateChange);
      if (altchaHoldRef.current) {
        releaseGlobalAltchaBusy();
        altchaHoldRef.current = false;
      }
      prevAltchaStateRef.current = null;
    };
  }, [enabled, url, sdkReady, onPayloadChange]);
  if (!enabled || !url || !sdkReady) return null;
  const useFloating = floating != null;
  const useOverlay = Boolean(overlay) && !useFloating;
  const floatingProps = useFloating
    ? {
        floating,
        ...(floatingAnchor === undefined
          ? {}
          : { floatinganchor: floatingAnchor }),
        floatingoffset: floatingOffset ?? 8,
      }
    : {};
  return (
    <div className={cn(useFloating && "contents", className)}>
      <altcha-widget
        ref={ref}
        challengeurl={url}
        credentials="omit"
        {...(useOverlay ? { overlay: true } : {})}
        {...floatingProps}
      />
      <input type="hidden" name="altcha" value={payload} readOnly />
    </div>
  );
}
