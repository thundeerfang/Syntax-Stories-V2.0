import type { LegalPolicyKind, LegalPolicyRecord } from '@/lib/api/legalAdmin';

export function legalDraftPath(kind: LegalPolicyKind, opts?: { startDraft?: boolean }): string {
  const base = `/legal/${kind}/draft`;
  return opts?.startDraft ? `${base}?startDraft=1` : base;
}

export function legalDraftViewPath(kind: LegalPolicyKind): string {
  return `${legalDraftPath(kind)}?mode=view`;
}

export function legalRevisionPath(kind: LegalPolicyKind, revisionId: string): string {
  return `/legal/${kind}/revisions/${encodeURIComponent(revisionId)}`;
}

export function legalRevisionViewPath(kind: LegalPolicyKind, revisionId: string): string {
  return `${legalRevisionPath(kind, revisionId)}?mode=view`;
}

/** Admin view page for the live published document (or draft if never published). */
export function legalLiveViewPath(kind: LegalPolicyKind, policy: LegalPolicyRecord): string {
  if (policy.publishedRevisionId) {
    return legalRevisionViewPath(kind, policy.publishedRevisionId);
  }
  return legalDraftViewPath(kind);
}

export function legalTabHref(kind: LegalPolicyKind): string {
  if (kind === 'terms') return '/legal';
  return `/legal?tab=${kind}`;
}

