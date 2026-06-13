'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import type { AdminUserDetail } from '@/admin';
import { listAuditLogs, type AuditLogRow } from '@/admin/api/management';
import { auditLogColumns } from '@/app/(dashboard)/audit/auditLogColumns';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';

export function UserAuditPanel({
  user,
  token,
}: {
  user: AdminUserDetail;
  token: string | null;
}) {
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await listAuditLogs(token, {
          userId: user.id,
          limit: 30,
          cursor: cursor ?? null,
        });
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    },
    [token, user.id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Actions performed by or targeting this user across admin and platform activity.
      </Typography>
      {error ? <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} /> : null}
      <AdminDataTable
        data={items}
        columns={auditLogColumns}
        loading={loading && items.length === 0}
        emptyMessage="No audit events for this user."
        enablePagination
        pageSize={15}
        dense
      />
      {nextCursor ? (
        <Button
          variant="outlined"
          size="small"
          disabled={loading}
          onClick={() => void load(nextCursor, true)}
          sx={{ alignSelf: 'flex-start' }}
        >
          {loading ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </Stack>
  );
}
