/** Shared display/format helpers for profile and public profile views. */

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatJoinedDate(createdAt: string | undefined): string {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function formatMonthYear(val: string | undefined): string {
  if (!val || val.length < 7) return '';
  const [y, m] = val.split('-');
  const i = Number.parseInt(m ?? '', 10);
  return Number.isNaN(i) || i < 1 || i > 12 ? val : `${SHORT_MONTHS[i - 1]} ${y}`;
}

/** Strip work arrangement suffixes like "(On-site)" from location (legacy / duplicated data). */
export function locationWithoutType(location: string | undefined): string {
  if (!location?.trim()) return '';
  return location.trim().replaceAll(/\s*\([^)]+\)/g, '').replaceAll(/\s+/g, ' ').trim();
}

export function normalizeDomain(domain: string | undefined): string {
  if (!domain?.trim()) return '';
  const d = domain.trim().replaceAll(/^https?:\/\//gi, '').replaceAll(/\/$/g, '');
  return d ? `https://${d}` : '';
}

export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export function domainFromUrl(url: string): string {
  const u = (url ?? '').trim();
  if (!u) return '';
  try {
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    return new URL(withProto).host;
  } catch {
    return u.replace(/^https?:\/\//i, '').split('/')[0] || u;
  }
}
