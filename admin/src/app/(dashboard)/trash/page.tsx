'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  fetchMe,
  fetchTrash,
  restoreTrashItem,
  type MeUser,
  type TrashResponse,
} from '@/lib/api';
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

  async function onRestore(resourceType: 'help' | 'blog' | 'user', id: string) {
    if (!token) return;
    if ((resourceType === 'blog' || resourceType === 'user') && !isAdmin) return;
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

  const helpRows = data?.help?.data ?? [];
  const blogRows = data?.blog?.data ?? [];
  const userRows = data?.users?.data ?? [];

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          Soft delete center
        </Typography>
        <Typography variant="body2" color="text.secondary" className="max-w-2xl">
          Restore help articles you can edit, or (as admin) blog posts and deactivated user accounts. Blog restores
          respect the same retention window as the main app trash.
        </Typography>
      </Box>

      {!isAdmin && (
        <Alert severity="info">
          Blog and user restore requires <strong>admin</strong> staff role. Help articles follow normal editor
          permissions.
        </Alert>
      )}

      {err && (
        <Alert severity="error" onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Help articles
        </Typography>
        <TrashTable
          empty="No help articles in trash."
          rows={helpRows.map((r) => ({
            key: r._id,
            primary: r.title || r.slug,
            secondary: r.slugBeforeDelete ? `was: ${r.slugBeforeDelete}` : r.slug,
            meta: r.deletedAt ? new Date(r.deletedAt).toLocaleString() : '—',
            onRestore: () => onRestore('help', r._id),
            disabled: busyId === `help:${r._id}`,
          }))}
        />
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" gap={1} className="mb-2">
          <Typography variant="subtitle1" fontWeight={700}>
            Blog posts
          </Typography>
          <Chip size="small" label="Admin only" color={isAdmin ? 'default' : 'warning'} variant="outlined" />
        </Stack>
        <TrashTable
          empty="No blog posts in trash."
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
          <Chip size="small" label="Admin only" color={isAdmin ? 'default' : 'warning'} variant="outlined" />
        </Stack>
        <TrashTable
          empty="No deactivated users."
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
}: {
  empty: string;
  rows: Array<{
    key: string;
    primary: string;
    secondary: string;
    meta: string;
    onRestore: () => void;
    disabled: boolean;
  }>;
}) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      className="border border-[var(--color-border)]"
      sx={{ borderColor: 'divider' }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Item</TableCell>
            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Deleted</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary" className="py-6 text-center">
                  {empty}
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.key} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {r.primary}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {r.secondary}
                </Typography>
                <Typography variant="caption" color="text.secondary" className="sm:hidden">
                  {r.meta}
                </Typography>
              </TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{r.meta}</TableCell>
              <TableCell align="right">
                <Button size="small" variant="outlined" disabled={r.disabled} onClick={r.onRestore}>
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
