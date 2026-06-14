export const PAGINATION = {
  follow: { default: 20, max: 50 },
  reference: { default: 15, max: 30, resolveMaxNames: 10 },
  adminList: { default: 25, max: 100 },
  adminTaxonomy: { default: 25, max: 200 },
} as const;
export function parseLimit(
  raw: unknown,
  profile: {
    default: number;
    max: number;
  },
): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return profile.default;
  return Math.min(n, profile.max);
}
export function parseAdminListLimit(raw: unknown): number {
  const n = Number(raw);
  const base =
    Number.isFinite(n) && n > 0 ? Math.floor(n) : PAGINATION.adminList.default;
  return Math.min(base, PAGINATION.adminList.max);
}
export function parseAdminTaxonomyListLimit(raw: unknown): number {
  const n = Number(raw);
  const base =
    Number.isFinite(n) && n > 0
      ? Math.floor(n)
      : PAGINATION.adminTaxonomy.default;
  return Math.min(base, PAGINATION.adminTaxonomy.max);
}
