"use client";

import { useMemo } from "react";

export function useProfileShareUrl(
  username?: string | null,
  fallbackPath = "/profile",
) {
  return useMemo(() => {
    if (globalThis.window !== undefined && username) {
      return `${globalThis.window.location.origin}/u/${username}`;
    }
    if (globalThis.window !== undefined) {
      return `${globalThis.window.location.origin}${fallbackPath}`;
    }
    return username ? `/u/${username}` : fallbackPath;
  }, [username, fallbackPath]);
}
