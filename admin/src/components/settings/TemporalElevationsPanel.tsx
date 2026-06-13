'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { SecuritySectionCard } from './SecuritySectionCard';
import { elevationColumns } from './securitySettingsColumns';
import {
  listIamElevations,
  revokeIamElevation,
  type TemporalGrantRow,
} from '@/admin/api/management';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export function TemporalElevationsPanel() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const temporalPermissionsEnabled = useSessionStore((s) => s.temporalPermissionsEnabled);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const [elevations, setElevations] = useState<TemporalGrantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canView = temporalPermissionsEnabled && hasPermission('admin_role:manage');

  const load = useCallback(async () => {
    if (!apiToken && !httpOnlyCookies) return;
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const el = await listIamElevations(apiToken);
      setElevations(el.items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'Step-up cancelled') return;
      setError(msg || 'Failed to load elevations');
    } finally {
      setLoading(false);
    }
  }, [apiToken, httpOnlyCookies, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  const elevationCols = useMemo(
    () =>
      elevationColumns({
        onRevoke: (id) => void revokeIamElevation(apiToken, id).then(() => load()),
      }),
    [apiToken, load]
  );

  if (!canView) {
    return (
      <Stack spacing={3}>
        <AdminBlinkSectionHeader title="Temporal elevations" />
        <Alert severity="info">
          Temporal permissions are disabled or you lack permission to manage role elevations.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <AdminBlinkSectionHeader title="Temporal elevations" />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <SecuritySectionCard
        icon={KeyRoundedIcon}
        title="Active grants"
        subtitle="Short-lived permission grants on your account"
      >
        <AdminDataTable
          data={elevations}
          columns={elevationCols}
          loading={loading}
          getRowId={(row) => row.id}
          emptyMessage="No active elevations"
          totalLabel="elevations"
          enablePagination={elevations.length > 10}
          pageSize={10}
          dense
        />
      </SecuritySectionCard>
    </Stack>
  );
}
