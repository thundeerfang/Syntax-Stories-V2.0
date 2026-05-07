'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  CircularProgress,
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
import { listContactLeads, type ContactLeadListItem } from '@/lib/api';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { useSessionStore } from '@/store/session';

export default function ContactLeadsPage() {
  const token = useSessionStore((s) => s.token);
  const [items, setItems] = useState<ContactLeadListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const r = await listContactLeads(token, { limit: 30, cursor: cursor ?? undefined });
        if (cursor) {
          setItems((prev) => [...prev, ...r.items]);
        } else {
          setItems(r.items);
        }
        setNextCursor(r.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contact leads');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Stack spacing={3}>
      <DashboardPageHeader
        title="Contact leads"
        subtitle="Inbound messages from the public /contact form. Open an item for the full thread and request metadata."
      />

      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}

      <TableContainer
        component={Paper}
        elevation={0}
        className="border border-[var(--color-border)]"
        sx={{ borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Submitted</TableCell>
              <TableCell>From</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Topic</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Company</TableCell>
              <TableCell align="right" width={100}>
                {' '}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No contact leads yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography variant="body2">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{row.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.email}
                    </Typography>
                    {row.username ? (
                      <Typography variant="caption" color="text.secondary" display="block">
                        @{row.username}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" noWrap title={row.topic}>
                      {row.topic}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2" color="text.secondary">
                      {row.company ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/contact-leads/${row.id}`} size="small" variant="outlined">
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {nextCursor ? (
        <Box>
          <Button variant="outlined" disabled={loading} onClick={() => void load(nextCursor)}>
            {loading ? <CircularProgress size={20} /> : 'Load more'}
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
