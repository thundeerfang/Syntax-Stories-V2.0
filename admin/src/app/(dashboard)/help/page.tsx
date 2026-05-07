'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Stack,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { deleteHelpArticleSoft, fetchMe, listHelpArticles, type HelpListItem } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function HelpListPage() {
  const token = useSessionStore((s) => s.token);
  const [items, setItems] = useState<HelpListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await fetchMe(token);
        const list = await listHelpArticles(token);
        if (!cancelled) setItems(list.data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onMoveToTrash(id: string, title: string) {
    if (!token) return;
    if (
      !window.confirm(
        `Move “${title}” to trash? It will disappear from the public help center until restored from Soft delete.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    setErr(null);
    try {
      await deleteHelpArticleSoft(token, id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Box>
      <Box className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Box>
          <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
            Help articles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Draft and publish articles shown in the product help center.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={Link} href="/trash" variant="outlined" size="medium">
            Soft delete center
          </Button>
          <Button component={Link} href="/help/new" variant="contained" startIcon={<AddRoundedIcon />}>
            New article
          </Button>
        </Stack>
      </Box>

      {err && (
        <Typography color="error" className="mb-4" variant="body2">
          {err}
        </Typography>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        className="border border-[var(--color-border)]"
        sx={{ borderColor: 'divider' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Title</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !err && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" className="py-6 text-center">
                    No articles yet. Create one to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((a) => (
              <TableRow key={a._id} hover>
                <TableCell>
                  <Link href={`/help/${a._id}/edit`} className="font-semibold text-[var(--color-primary)] no-underline hover:underline">
                    {a.title || a.slug}
                  </Link>
                  <Typography variant="caption" color="text.secondary" className="mt-0.5 block md:hidden">
                    {a.slug}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{a.slug}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {a.status}
                    {a.isPublished ? ' · live' : ''} · v{a.publishedVersion}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    <Button component={Link} href={`/help/${a._id}/edit`} size="small">
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      aria-label="Move to trash"
                      disabled={deletingId === a._id}
                      onClick={() => onMoveToTrash(a._id, a.title || a.slug)}
                      color="default"
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
