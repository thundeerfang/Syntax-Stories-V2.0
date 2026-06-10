'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { trashTableColumns, type TrashTableRow } from './trashTableColumns';
import { fetchMe, fetchTrash, restoreTrashItem, type MeUser, type TrashResponse } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function TrashPage() {
  const token = useSessionStore((s) => s.token);
  const [data, setData] = useState<TrashResponse | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const u = await fetchMe(token);
    setMe(u.user);
    const t = await fetchTrash(token);
    setData(t);
  }, [token]);

  useEffect(() => {
    void load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
  }, [load]);

  const isAdmin = me?.staffRole === 'admin';

  async function onRestore(resourceType: 'blog' | 'user', id: string) {
    if (!token) return;
    if (!isAdmin) return;
    setBusyId(`${resourceType}:${id}`);
    setErr(null);
    try {
      await restoreTrashItem(token, resourceType, id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusyId(null);
    }
  }

  const blogRows = data?.blog?.data ?? [];
  const userRows = data?.users?.data ?? [];

  return (
    <Stack spacing={4}>
      <Box>
        <Typography
          variant="h4"
          component="h1"
          fontWeight={800}
          className="tracking-tight"
          gutterBottom
        >
          Soft delete center
        </Typography>
        <Typography variant="body2" color="text.secondary" className="max-w-2xl">
          Restore blog posts and deactivated user accounts from trash. Blog restores respect the same
          retention window as the main app trash.
        </Typography>
      </Box>

      {!isAdmin && (
        <Alert severity="info">
          Blog and user restore requires <strong>admin</strong> staff role.
        </Alert>
      )}

      {err && (
        <Alert severity="error" onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Box>
        <Stack direction="row" alignItems="center" gap={1} className="mb-2">
          <Typography variant="subtitle1" fontWeight={700}>
            Blog posts
          </Typography>
          <Chip
            size="small"
            label="Admin only"
            color={isAdmin ? 'default' : 'warning'}
            variant="outlined"
          />
        </Stack>
        <TrashTable
          empty="No blog posts in trash."
          totalLabel="posts"
          rows={blogRows.map((r) => ({
            key: r._id,
            primary: r.title,
            secondary: r.authorUsername ? `@${r.authorUsername}` : r.authorId,
            meta: r.deletedAt ? new Date(r.deletedAt).toLocaleString() : '—',
            onRestore: () => onRestore('blog', r._id),
            disabled: !isAdmin || busyId === `blog:${r._id}`,
          }))}
        />
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" gap={1} className="mb-2">
          <Typography variant="subtitle1" fontWeight={700}>
            Users (deactivated)
          </Typography>
          <Chip
            size="small"
            label="Admin only"
            color={isAdmin ? 'default' : 'warning'}
            variant="outlined"
          />
        </Stack>
        <TrashTable
          empty="No deactivated users."
          totalLabel="users"
          rows={userRows.map((r) => ({
            key: r._id,
            primary: r.fullName || r.username,
            secondary: `${r.email} · @${r.username}`,
            meta: r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—',
            onRestore: () => onRestore('user', r._id),
            disabled: !isAdmin || busyId === `user:${r._id}`,
          }))}
        />
      </Box>
    </Stack>
  );
}

function TrashTable({
  empty,
  rows,
  totalLabel,
}: {
  empty: string;
  rows: TrashTableRow[];
  totalLabel: string;
}) {
  const columns = useMemo(() => trashTableColumns, []);

  return (
    <AdminDataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.key}
      emptyMessage={empty}
      totalLabel={totalLabel}
      enablePagination={rows.length > 10}
      pageSize={10}
      dense
    />
  );
}
