'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { listAuditLogs, type AuditLogRow } from '@/admin/api/management';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { useSessionStore } from '@/store/session';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { auditLogColumns } from './auditLogColumns';

export default function AuditPage() {
  const token = useSessionStore((s) => s.token);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const columns = useMemo(() => auditLogColumns, []);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!token || !hasPermission('audit:read')) return;
      setLoading(true);
      setError(null);
      try {
        const data = await listAuditLogs(token, {
          limit: 100,
          cursor: cursor ?? null,
        });
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    },
    [token, hasPermission]
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  if (!hasPermission('audit:read')) {
    return <Alert severity="warning">You need the audit:read permission to view this page.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="Audit log"
        description="Admin and authentication events (newest first)."
        icon={<HistoryRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Audit log', '/audit')}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading && items.length === 0}
        getRowId={(row) => row.id}
        emptyMessage="No audit events yet."
        totalLabel="events"
        enableGlobalFilter
        globalFilterPlaceholder="Filter by action, actor, IP…"
        pageSize={25}
        maxHeight="calc(100vh - 280px)"
        dense
      />

      {nextCursor ? (
        <Button variant="outlined" disabled={loading} onClick={() => void load(nextCursor)}>
          Load more
        </Button>
      ) : null}
    </Stack>
  );
}
