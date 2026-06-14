import path from "node:path";
const DEFAULT_MAX_LENGTH = 120;
export function fileBaseNameFromOriginal(originalName: string): string {
  let base = path.basename((originalName ?? "").trim());
  const dot = base.lastIndexOf(".");
  if (dot > 0) base = base.slice(0, dot);
  base = base.trim();
  return base.length > 0 ? base : "image";
}
export function buildUploadImageMeta(
  originalName: string,
  username: string,
  maxLength = DEFAULT_MAX_LENGTH,
): {
  title: string;
  alt: string;
} {
  const user = (username ?? "").trim() || "user";
  const fileBase = fileBaseNameFromOriginal(originalName);
  const text = `${user} · ${fileBase}`;
  const clipped = text.length > maxLength ? text.slice(0, maxLength) : text;
  return { title: clipped, alt: clipped };
}
