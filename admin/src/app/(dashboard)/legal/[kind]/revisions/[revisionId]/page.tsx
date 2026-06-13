'use client';

import { notFound } from 'next/navigation';
import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { LegalDocumentWorkspace } from '@/components/legal/LegalDocumentWorkspace';
import { isLegalPolicyKind } from '@/lib/legal/legalLabels';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

function RevisionPageInner({
  kind,
  revisionId,
}: {
  kind: string;
  revisionId: string;
}) {
  const searchParams = useSearchParams();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const readOnly = searchParams.get('mode') !== 'edit';

  if (!isLegalPolicyKind(kind)) notFound();

  return (
    <LegalDocumentWorkspace
      kind={kind}
      apiToken={apiToken}
      mode="revision"
      revisionId={revisionId}
      readOnly={readOnly}
    />
  );
}

export default function LegalRevisionPage({
  params,
}: {
  params: Promise<{ kind: string; revisionId: string }>;
}) {
  const { kind, revisionId } = use(params);
  return (
    <Suspense fallback={null}>
      <RevisionPageInner kind={kind} revisionId={revisionId} />
    </Suspense>
  );
}
