"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string, successMessage = "Link copied to clipboard") => {
      if (!text.trim()) return false;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(successMessage);
        globalThis.setTimeout(() => setCopied(false), resetMs);
        return true;
      } catch {
        toast.error("Failed to copy link");
        return false;
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
