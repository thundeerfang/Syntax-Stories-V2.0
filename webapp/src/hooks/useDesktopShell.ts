"use client";
import { useSyncExternalStore } from "react";
import { isDesktopBuild, isDesktopShell } from "@/lib/desktop/isDesktop";
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return isDesktopShell();
}
function getServerSnapshot() {
  return isDesktopBuild();
}
export function useDesktopShell(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
