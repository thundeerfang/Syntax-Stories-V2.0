'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { Suspense, use } from 'react';
import { LegalDocumentWorkspace } from '@/components/legal/LegalDocumentWorkspace';
import { isLegalPolicyKind } from '@/lib/legal/legalLabels';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

function DraftPageInner({ kind }: { kind: string }) {
  const searchParams = useSearchParams();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const readOnly = searchParams.get('mode') === 'view';
  const startDraft = searchParams.get('startDraft') === '1';

  if (!isLegalPolicyKind(kind)) notFound();

  return (
    <LegalDocumentWorkspace
      kind={kind}
      apiToken={apiToken}
      mode="draft"
      readOnly={readOnly}
      startDraft={startDraft}
    />
  );
}

export default function LegalDraftPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = use(params);
  return (
    <Suspense fallback={null}>
      <DraftPageInner kind={kind} />
    </Suspense>
  );
}
