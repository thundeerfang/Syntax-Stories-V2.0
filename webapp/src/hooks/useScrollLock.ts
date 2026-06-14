"use client";
import { useEffect } from "react";
import { acquireScrollLock } from "@/lib/dom/scrollLock";
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    return acquireScrollLock();
  }, [locked]);
}
