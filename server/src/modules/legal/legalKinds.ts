import { z } from 'zod';

export const LEGAL_KINDS = ['terms', 'privacy', 'udd'] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];

export const KIND_TO_SLUG: Record<LegalKind, string> = {
  terms: 'terms-of-service',
  privacy: 'privacy-policy',
  udd: 'user-data-deletion',
};

export function slugForKind(kind: LegalKind): string {
  return KIND_TO_SLUG[kind];
}

export function kindFromSlug(slug: string): LegalKind | null {
  const e = Object.entries(KIND_TO_SLUG).find(([, s]) => s === slug);
  return e ? (e[0] as LegalKind) : null;
}

export const legalKindParamSchema = z.enum(LEGAL_KINDS);

export const ACCEPT_POLICY_KINDS = ['terms', 'privacy'] as const;
export type AcceptPolicyKind = (typeof ACCEPT_POLICY_KINDS)[number];
