import type { LegalPolicyKind } from '@/lib/api/legalAdmin';

export const LEGAL_KIND_LABEL: Record<LegalPolicyKind, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  udd: 'User Data Deletion',
};

export const LEGAL_KIND_SHORT: Record<LegalPolicyKind, string> = {
  terms: 'Terms',
  privacy: 'Privacy',
  udd: 'UDD',
};

export const LEGAL_TAB_KEYS = ['terms', 'privacy', 'udd'] as const;

export function isLegalPolicyKind(value: string): value is LegalPolicyKind {
  return value === 'terms' || value === 'privacy' || value === 'udd';
}
