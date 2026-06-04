'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import {
  listUsers,
  searchUsers,
  type AdminUserAccountFilter,
  type AdminUserListItem,
} from '@/admin';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminFilterSelect } from '@/components/ui/AdminFilterSelect';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import { isAdminAuthActive, resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { ADMIN_ACCOUNT_FILTER_OPTIONS } from '@/lib/users/adminAccountFilterOptions';
import { useAdminAccountsSearchQuery } from '@/lib/users/useAdminAccountsSearchQuery';
import { useSessionStore } from '@/store/session';
import { platformAccountsColumns } from './platformAccountsColumns';

export function PlatformAccountsPanel({ token }: { token: string | null }) {
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const { query, setQuery } = useAdminAccountsSearchQuery();
  const [accountFilter, setAccountFilter] = useState<AdminUserAccountFilter>('all');
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(() => platformAccountsColumns, []);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!isAdminAuthActive(token, httpOnlyCookies)) return;
      setLoading(true);
      setError(null);
      try {
        if (query.trim().length >= 2) {
          const r = await searchUsers(apiToken, query.trim(), 50, accountFilter);
          setItems(r.items);
          setNextCursor(null);
        } else {
          const r = await listUsers(apiToken, {
            limit: 100,
            cursor: cursor ?? undefined,
            accountType: accountFilter,
          });
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
    [apiToken, httpOnlyCookies, query, token, accountFilter]
  );

  useEffect(() => {
    if (!isAdminAuthActive(token, httpOnlyCookies)) return;
    const t = setTimeout(
      () => {
        void load();
      },
      query.trim().length >= 2 ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [token, httpOnlyCookies, query, accountFilter, load]);

  if (!isAdminAuthActive(token, httpOnlyCookies)) return null;

  return (
    <Stack spacing={2.5}>
      <AdminBlinkSectionHeader
        title="Platform accounts"
        right={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 420 } }}
          >
            <AdminSearchField
              value={query}
              onChange={setQuery}
              placeholder="Search email, username, or name"
              sx={{ minWidth: { xs: '100%', sm: 240 }, maxWidth: { sm: 360 }, flex: 1 }}
            />
            <AdminFilterSelect
              aria-label="Account type"
              value={accountFilter}
              onChange={setAccountFilter}
              options={ADMIN_ACCOUNT_FILTER_OPTIONS}
              disabled={loading}
            />
          </Stack>
        }
      />


      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage="No accounts match your filters."
        totalLabel="accounts"
        pageSize={25}
        dense
      />

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
