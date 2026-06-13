'use client';

import { useRouter } from 'next/navigation';
import { StepUpDialog } from '@/components/auth/StepUpDialog';
import { rejectPendingStepUp, resolvePendingStepUp } from '@/lib/auth/adminAuthenticatedFetch';
import { isAdminAuthActive, resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export function StepUpDialogHost() {
  const router = useRouter();
  const stepUpRequired = useSessionStore((s) => s.stepUpRequired);
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  if (!stepUpRequired || !isAdminAuthActive(token, httpOnlyCookies)) return null;

  function onCancel() {
    rejectPendingStepUp(new Error('Step-up cancelled'));
    router.replace('/');
  }

  return (
    <StepUpDialog
      open
      accessToken={apiToken}
      onSuccess={() => resolvePendingStepUp()}
      onClose={onCancel}
    />
  );
}
