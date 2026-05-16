/**
 * Entity option helpers for company / school / organization autocomplete.
 * Logos via Clearbit: https://logo.clearbit.com/{domain}
 */

export type { EntityOption } from '@/api/reference';

export function getLogoUrl(domain: string): string {
  if (!domain?.trim()) return '';
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  return d ? `https://logo.clearbit.com/${d}` : '';
}
