/** Client-side preview only — the server generates the canonical slug. */
export function previewSlugFromDisplayName(name: string, maxLen = 64): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base) return '';
  const withPrefix = /^[a-z]/.test(base) ? base : `x-${base}`.replace(/^-+/, '');
  return withPrefix.slice(0, maxLen).replace(/-+$/, '');
}
