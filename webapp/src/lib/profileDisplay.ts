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
    return u.replaceAll(/^https?:\/\//gi, '').split('/')[0] || u;
  }
}

export function entriesCountSubtitle(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count === 1 ? `${count} entry` : `${count} entries`;
}

export function reposCountSubtitle(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count === 1 ? `${count} repo` : `${count} repos`;
}

/** Min visible rows after opening an accordion section (matches profile/public profile UX). */
export function profileSectionMinVisible(
  variant: string,
  prior: number | undefined,
): number {
  const floor = variant === 'openSource' || variant === 'mySetup' ? 2 : 1;
  return Math.max(prior ?? floor, floor);
}

export function markdownBioToHtml(raw: string): string {
  const escapeHtml = (str: string) =>
    str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  let s = escapeHtml(raw || '');
  s = s.replaceAll(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replaceAll(/__([^_\n]+)__/g, '<u>$1</u>');
  s = s.replaceAll(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return s.replaceAll('\n', '<br>');
}

export function workExperienceListKey(e: Record<string, unknown>): string {
  const id = e.id ?? e.workId;
  if (typeof id === 'string' && id.length > 0) return `we-${id}`;
  const company = typeof e.company === 'string' ? e.company : '';
  const start = typeof e.startDate === 'string' ? e.startDate : '';
  const title = typeof e.title === 'string' ? e.title : '';
  return `we-${company}-${start}-${title}`.replaceAll(/\s+/g, '-');
}

export function educationListKey(e: Record<string, unknown>): string {
  const id = e.eduId ?? e.id;
  if (typeof id === 'string' && id.length > 0) return `edu-${id}`;
  const school = typeof e.school === 'string' ? e.school : '';
  const start = typeof e.startDate === 'string' ? e.startDate : '';
  return `edu-${school}-${start}`.replaceAll(/\s+/g, '-');
}

export function certificationListKey(c: Record<string, unknown>): string {
  const id = c.certId ?? c.id;
  if (typeof id === 'string' && id.length > 0) return `cert-${id}`;
  const name = typeof c.name === 'string' ? c.name : '';
  const org = typeof c.issuingOrganization === 'string' ? c.issuingOrganization : '';
  return `cert-${name}-${org}`.replaceAll(/\s+/g, '-');
}

export function projectListKey(p: Record<string, unknown>): string {
  const id = p.id ?? p._id;
  if (typeof id === 'string' && id.length > 0) return `proj-${id}`;
  const title = typeof p.title === 'string' ? p.title : '';
  const url = typeof p.publicationUrl === 'string' ? p.publicationUrl : '';
  return `proj-${title}-${url}`.replaceAll(/\s+/g, '-');
}

export function openSourceListKey(item: Record<string, unknown>): string {
  const repo = typeof item.repoFullName === 'string' ? item.repoFullName : '';
  const url = typeof item.publicationUrl === 'string' ? item.publicationUrl : '';
  return `os-${repo || url || 'item'}`.replaceAll(/\s+/g, '-');
}
