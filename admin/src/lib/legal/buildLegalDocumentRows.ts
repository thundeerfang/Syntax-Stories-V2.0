import type { LegalPolicyRecord, LegalPolicyRevision } from '@/lib/api/legalAdmin';

export type LegalDocumentPhase = 'draft' | 'current' | 'past';

export type LegalDocumentRow = {
  id: string;
  rowType: 'draft' | 'revision';
  title: string;
  version: number;
  phase: LegalDocumentPhase;
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
  revisionId?: string;
};

function isWorkingDraft(policy: LegalPolicyRecord): boolean {
  return policy.status === 'draft' || policy.status === 'in_review' || policy.status === 'approved';
}

export function buildLegalDocumentRows(
  policy: LegalPolicyRecord,
  revisions: LegalPolicyRevision[]
): LegalDocumentRow[] {
  const rows: LegalDocumentRow[] = [];
  const publishedId = policy.publishedRevisionId ?? null;

  if (isWorkingDraft(policy)) {
    const nextVersion =
      policy.publishedRevisionId != null ? (policy.version ?? 0) + 1 : Math.max(1, policy.version || 1);
    rows.push({
      id: 'draft',
      rowType: 'draft',
      title: policy.title,
      version: nextVersion,
      phase: 'draft',
      status: policy.status,
      publishedAt: null,
      updatedAt: policy.updatedAt ?? null,
    });
  }

  for (const rev of revisions) {
    const isCurrent = rev.status === 'published' && rev.revisionId === publishedId;
    rows.push({
      id: rev.revisionId,
      rowType: 'revision',
      revisionId: rev.revisionId,
      title: rev.title,
      version: rev.version,
      phase: isCurrent ? 'current' : 'past',
      status: rev.status,
      publishedAt: rev.publishedAt ?? null,
      updatedAt: rev.createdAt ?? null,
    });
  }

  return rows;
}
