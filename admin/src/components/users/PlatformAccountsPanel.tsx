'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { listUsers, searchUsers, type AdminUserListItem } from '@/admin';

export function PlatformAccountsPanel({ token }: { token: string | null }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        if (query.trim().length >= 2) {
          const r = await searchUsers(token, query.trim(), 50);
          setItems(r.items);
          setNextCursor(null);
        } else {
          const r = await listUsers(token, { limit: 25, cursor: cursor ?? undefined });
          if (cursor) {
            setItems((prev) => [...prev, ...r.items]);
          } else {
            setItems(r.items);
          }
          setNextCursor(r.nextCursor);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [token, query]
  );

  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => {
      void load();
    }, query.trim().length >= 2 ? 300 : 0);
    return () => clearTimeout(t);
  }, [token, query, load]);

  return (
    <Stack spacing={2.5}>
      <TextField
        size="small"
        label="Search accounts"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Email, username, or name (min. 2 characters)"
        sx={{ maxWidth: 440 }}
      />

      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        className="border border-[var(--color-border)]"
        sx={{ borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Account</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Plan</TableCell>
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
                    No accounts match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography fontWeight={600}>{row.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      @{row.username}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.email}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={row.isActive ? 'Active' : 'Locked'}
                        color={row.isActive ? 'success' : 'default'}
                        variant="outlined"
                      />
                      {row.staffRole ? (
                        <Chip size="small" label={row.staffRole} color="primary" variant="outlined" />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {row.subscriptionPlanKey ?? '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/users/${row.id}`} size="small" variant="outlined">
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {nextCursor && query.trim().length < 2 ? (
        <Box>
          <Button variant="outlined" disabled={loading} onClick={() => void load(nextCursor)}>
            {loading ? <CircularProgress size={20} /> : 'Load more'}
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
