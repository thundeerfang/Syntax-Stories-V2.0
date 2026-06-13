'use client';

import { Alert, Button } from '@mui/material';
import { endImpersonation, fetchManagementMe } from '@/admin/api/management';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export function ImpersonationBanner() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const impersonation = useSessionStore((s) => s.impersonation);
  const setManagementContext = useSessionStore((s) => s.setManagementContext);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  if (!impersonation) return null;

  const label =
    impersonation.targetUsername ?? impersonation.targetEmail ?? impersonation.targetUserId;

  async function onEnd() {
    await endImpersonation(apiToken);
    const me = await fetchManagementMe(apiToken);
    setManagementContext(me);
  }

  return (
    <Alert
      severity="warning"
      sx={{ borderRadius: 0 }}
      action={
        <Button color="inherit" size="small" onClick={() => void onEnd()}>
          Exit impersonation
        </Button>
      }
    >
      Impersonating <strong>{label}</strong>
      {impersonation.expiresAt
        ? ` — expires ${new Date(impersonation.expiresAt).toLocaleTimeString()}`
        : null}
    </Alert>
  );
}
