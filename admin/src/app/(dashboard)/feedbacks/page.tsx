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
  Typography,
} from '@mui/material';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import {
  listFeedbackSubmissions,
  type FeedbackSubmissionListItem,
} from '@/lib/api';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { useSessionStore } from '@/store/session';

export default function FeedbacksPage() {
  const token = useSessionStore((s) => s.token);
  const [items, setItems] = useState<FeedbackSubmissionListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const r = await listFeedbackSubmissions(token, { limit: 30, cursor: cursor ?? undefined });
        if (cursor) {
          setItems((prev) => [...prev, ...r.items]);
        } else {
          setItems(r.items);
        }
        setNextCursor(r.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load feedback');
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
        title="Feedback"
        subtitle="Form submissions from the public feedback flow. Open an item for a full review with tabs."
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
              <TableCell>Category</TableCell>
              <TableCell>From</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Subject</TableCell>
              <TableCell width={56} align="center">
                File
              </TableCell>
              <TableCell align="right" width={100}>
                {' '}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No submissions yet.
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
                    <Chip size="small" label={row.categoryLabel} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>
                      {row.firstName} {row.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" noWrap title={row.subject}>
                      {row.subject}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {row.hasAttachment ? (
                      <AttachFileRoundedIcon fontSize="small" color="action" aria-label="Has attachment" />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/feedbacks/${row.id}`} size="small" variant="outlined">
                      Review
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
