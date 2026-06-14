import type { ImageBlockLayout } from "@/types/blog";
export function coerceImageLayout(raw: unknown): ImageBlockLayout {
  if (raw === "landscape" || raw === "square" || raw === "fullWidth")
    return raw;
  if (raw === "natural" || raw === "center") return "landscape";
  return "landscape";
}
