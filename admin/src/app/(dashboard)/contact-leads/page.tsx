'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import ContactMailRoundedIcon from '@mui/icons-material/ContactMailRounded';
import { listContactLeads, type ContactLeadListItem } from '@/lib/api';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFilterSelect } from '@/components/ui/AdminFilterSelect';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import {
  filterAndSortContactLeads,
  type ContactLeadFilter,
  type ContactLeadSort,
} from '@/lib/contactLeads/filterContactLeads';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import { contactLeadsColumns } from './contactLeadsColumns';

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All leads' },
  { value: 'members' as const, label: 'Signed-in users' },
  { value: 'guests' as const, label: 'Guests' },
  { value: 'with_company' as const, label: 'With company' },
];

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest first' },
  { value: 'oldest' as const, label: 'Oldest first' },
];

export default function ContactLeadsPage() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [items, setItems] = useState<ContactLeadListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ContactLeadFilter>('all');
  const [sort, setSort] = useState<ContactLeadSort>('newest');

  const columns = useMemo(() => contactLeadsColumns, []);

  const filteredItems = useMemo(
    () => filterAndSortContactLeads(items, { search, filter, sort }),
    [items, search, filter, sort]
  );

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!apiToken) return;
      setLoading(true);
      setError(null);
      try {
        const r = await listContactLeads(apiToken, { limit: 100, cursor: cursor ?? undefined });
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
    [apiToken]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="Contact leads"
        description="Inbound messages from the public /contact form. Open an item for the full thread and request metadata."
        icon={<ContactMailRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Contact leads', '/contact-leads')}
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="All leads"
        right={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 420 } }}
          >
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search name, email, topic…"
              sx={{ minWidth: { xs: '100%', sm: 240 }, flex: 1 }}
            />
            <AdminFilterSelect
              aria-label="Filter leads"
              value={filter}
              onChange={setFilter}
              options={FILTER_OPTIONS}
              sx={{ minWidth: { xs: '100%', sm: 168 } }}
            />
            <AdminFilterSelect
              aria-label="Sort leads"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
              sx={{ minWidth: { xs: '100%', sm: 150 } }}
            />
          </Stack>
        }
      />

      <AdminDataTable
        data={filteredItems}
        columns={columns}
        loading={loading && items.length === 0}
        getRowId={(row) => row.id}
        emptyMessage={
          search.trim() || filter !== 'all'
            ? 'No leads match your search or filters.'
            : 'No contact leads yet.'
        }
        totalLabel="leads"
        pageSize={25}
        dense
      />

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
