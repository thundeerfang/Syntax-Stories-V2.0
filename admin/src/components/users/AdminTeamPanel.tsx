'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { listAdminOperators, patchAdminOperator, type AdminOperatorRow } from '@/admin';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { isAdminAuthActive, resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useAdminStepUpRetry } from '@/lib/auth/useAdminStepUpRetry';
import { useSessionStore } from '@/store/session';
import { AddAdminUserDialog } from './AddAdminUserDialog';
import { adminTeamColumns } from './adminTeamColumns';

export function AdminTeamPanel({ token }: { token: string | null }) {
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const [items, setItems] = useState<AdminOperatorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAdminAuthActive(token, httpOnlyCookies)) return;
    setLoading(true);
    setError(null);
    try {
      const r = await listAdminOperators(apiToken);
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin users');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiToken, httpOnlyCookies, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useAdminStepUpRetry(refresh);

  const toggleActive = useCallback(async (row: AdminOperatorRow, next: boolean) => {
    if (!isAdminAuthActive(token, httpOnlyCookies)) return;
    setBusyId(row.id);
    setError(null);
    try {
      await patchAdminOperator(apiToken, row.id, { isActive: next });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }, [apiToken, httpOnlyCookies, refresh, token]);

  const columns = useMemo(
    () => adminTeamColumns(busyId, (row, next) => void toggleActive(row, next)),
    [busyId, toggleActive]
  );

  if (!isAdminAuthActive(token, httpOnlyCookies)) return null;

  return (
    <Stack spacing={2}>
      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="Operators"
        right={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add operator
          </Button>
        }
      />

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage='No operators yet. Use "Add admin user" after roles exist in the system.'
        totalLabel="operators"
        pageSize={25}
        dense
      />

      <AddAdminUserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        token={apiToken}
        onCreated={() => void refresh()}
      />
    </Stack>
  );
}
