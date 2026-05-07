import type { PublishedPolicyResponse } from '@contracts/legalApi';

const UTC_MONTH = [
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

/**
 * Calendar date in UTC only — same string on server and client (no locale / timezone blink).
 */
export function formatUtcPolicyCalendarDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const m = UTC_MONTH[d.getUTCMonth()];
  const day = d.getUTCDate();
  const y = d.getUTCFullYear();
  return `${m} ${day}, ${y}`;
}

/** Single-line summary for `aria-label` / metadata. */
export function formatLegalPolicyVersionMeta(
  data: Pick<PublishedPolicyResponse, 'version' | 'publishedAt' | 'effectiveAt'>,
): string {
  const published = formatUtcPolicyCalendarDate(data.publishedAt);
  let s = `Version ${data.version}`;
  if (published) s += ` · Published ${published}`;
  if (data.effectiveAt && data.effectiveAt !== data.publishedAt) {
    const eff = formatUtcPolicyCalendarDate(data.effectiveAt);
    if (eff) s += ` · Effective ${eff}`;
  }
  return s;
}

/** Stacked lines for the header version badge (version + dates). */
export function getLegalPolicyVersionBadgeLines(
  data: Pick<PublishedPolicyResponse, 'version' | 'publishedAt' | 'effectiveAt'>,
): string[] {
  const lines: string[] = [`Version ${data.version}`];
  const published = formatUtcPolicyCalendarDate(data.publishedAt);
  if (published) lines.push(`Published ${published}`);
  if (data.effectiveAt && data.effectiveAt !== data.publishedAt) {
    const eff = formatUtcPolicyCalendarDate(data.effectiveAt);
    if (eff) lines.push(`Effective ${eff}`);
  }
  return lines;
}
