/** Shared display/format helpers for profile and public profile views. */

import { formatMonthYearShort } from '@/lib/profile/dateLabels';

export function formatJoinedDate(createdAt: string | undefined): string {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Format `YYYY-MM` → `Jan 2024` (alias for cards that expect optional input). */
export function formatMonthYear(val: string | undefined): string {
  if (!val) return '';
  return formatMonthYearShort(val);
}

/** Strip work arrangement suffixes like "(On-site)" from location (legacy / duplicated data). */
export function locationWithoutType(location: string | undefined): string {
  if (!location?.trim()) return '';
  return location
    .trim()
    .replaceAll(/\s*\([^)]+\)/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function normalizeDomain(domain: string | undefined): string {
  if (!domain?.trim()) return '';
  const d = domain
    .trim()
    .replaceAll(/^https?:\/\//gi, '')
    .replaceAll(/\/$/g, '');
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
export function profileSectionMinVisible(variant: string, prior: number | undefined): number {
  const floor = variant === 'openSource' || variant === 'mySetup' ? 2 : 1;
  return Math.max(prior ?? floor, floor);
}

const PLACEHOLDER_PROFILE_BIOS = new Set([
  'Welcome to Syntax Stories 🧑🏻‍💻, you can add your bio you want..🚀',
  'Welcome to Syntax Stories 🧑🏻‍💻',
]);

export function isPlaceholderProfileBio(bio?: string | null): boolean {
  const t = (bio ?? '').trim();
  return t.length === 0 || PLACEHOLDER_PROFILE_BIOS.has(t);
}

export function normalizeBioForEdit(bio?: string | null): string {
  if (isPlaceholderProfileBio(bio)) return '';
  return bio ?? '';
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
