import crypto from "node:crypto";
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LEN,
  SEARCH_MIN_CHARS,
} from "@syntax-stories/shared";
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_QUERY_LEN);
}
export function escapeRegex(q: string): string {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function hashSearchQuery(q: string): string {
  return crypto
    .createHash("sha256")
    .update(q.toLowerCase())
    .digest("hex")
    .slice(0, 16);
}
export function parseSearchLimit(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return SEARCH_DEFAULT_LIMIT;
  return Math.min(n, SEARCH_MAX_LIMIT);
}
export function parseSearchTypes(raw: unknown): string[] {
  const all = "all";
  const s = String(raw ?? all)
    .trim()
    .toLowerCase();
  if (!s || s === all) {
    return ["users", "tags", "categories", "squads", "blogs", "features"];
  }
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
export function parseSearchContext(raw: unknown): "default" | "mention" {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  return s === "mention" ? "mention" : "default";
}
export function minCharsForSearch(
  types: string[],
  context: "default" | "mention",
): number {
  if (context === "mention" && types.length === 1 && types[0] === "users")
    return 1;
  return SEARCH_MIN_CHARS;
}
