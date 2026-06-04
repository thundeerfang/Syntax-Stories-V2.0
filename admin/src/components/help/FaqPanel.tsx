'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Paper, Stack } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { deleteHelpArticleSoft, listHelpArticles, type HelpListItem } from '@/lib/api';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFilterSelect } from '@/components/ui/AdminFilterSelect';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import {
  filterAndSortHelpArticles,
  type HelpArticleFilter,
} from '@/lib/help/filterHelpArticles';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import { helpArticlesColumns } from '@/app/(dashboard)/help/helpArticlesColumns';

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All items' },
  { value: 'published' as const, label: 'Published' },
  { value: 'draft' as const, label: 'Drafts' },
];

export function FaqPanel() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [items, setItems] = useState<HelpListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HelpArticleFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trashTarget, setTrashTarget] = useState<{ id: string; title: string } | null>(null);

  const filteredItems = useMemo(
    () => filterAndSortHelpArticles(items, { search, filter, sort: 'newest' }),
    [items, search, filter]
  );

  const load = useCallback(async () => {
    if (!apiToken) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listHelpArticles(apiToken, 1, 100);
      setItems(list.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load FAQ items');
    } finally {
      setLoading(false);
    }
  }, [apiToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmMoveToTrash() {
    if (!apiToken || !trashTarget) return;
    setDeletingId(trashTarget.id);
    setError(null);
    try {
      await deleteHelpArticleSoft(apiToken, trashTarget.id);
      setItems((prev) => prev.filter((x) => x._id !== trashTarget.id));
      setTrashTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    () =>
      helpArticlesColumns({
        deletingId,
        onMoveToTrash: (id, title) => setTrashTarget({ id, title }),
      }),
    [deletingId]
  );

  return (
    <Stack spacing={2}>
      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="Help center articles"
        right={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 360 } }}
          >
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search title or slug…"
              sx={{ minWidth: { xs: '100%', sm: 200 }, flex: 1 }}
            />
            <AdminFilterSelect
              aria-label="Filter FAQ items"
              value={filter}
              onChange={setFilter}
              options={FILTER_OPTIONS}
              sx={{ minWidth: { xs: '100%', sm: 148 } }}
            />
            <Button
              component={Link}
              href="/trash"
              variant="outlined"
              size="small"
              startIcon={<DeleteOutlineRoundedIcon />}
              sx={{ flexShrink: 0 }}
            >
              Soft delete
            </Button>
            <Button
              component={Link}
              href="/help/new"
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              sx={{ flexShrink: 0 }}
            >
              New FAQ item
            </Button>
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
        <AdminDataTable
          data={filteredItems}
          columns={columns}
          loading={loading}
          getRowId={(row) => row._id}
          emptyMessage={
            search.trim() || filter !== 'all'
              ? 'No FAQ items match your search or filters.'
              : 'No FAQ items yet. Create one or run `npm run seed:faq` on the server.'
          }
          totalLabel="FAQ items"
          pageSize={25}
          dense
        />
      </Paper>

      <ConfirmArchiveDialog
        open={Boolean(trashTarget)}
        title="Move FAQ item to trash?"
        description={
          trashTarget
            ? `“${trashTarget.title}” will be removed from /help until restored from Soft delete.`
            : ''
        }
        confirmLabel="Move to trash"
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => void confirmMoveToTrash()}
        loading={Boolean(deletingId)}
      />
    </Stack>
  );
}
