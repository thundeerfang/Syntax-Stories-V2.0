'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import {
  bulkCreateBlogTags,
  createBlogTag,
  listBlogTags,
  type AdminBlogTagListItem,
} from '@/admin';
import { BlogTaxonomyFormDialog, type TaxonomyFormValues } from '@/components/taxonomy/BlogTaxonomyFormDialog';
import { BulkTagsDialog } from '@/components/taxonomy/BulkTagsDialog';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFilterSelect } from '@/components/ui/AdminFilterSelect';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { parseTaxonomyCsv, taxonomyRowsToPayload } from '@/lib/taxonomy/parseTaxonomyCsv';
import { tagDetailPath } from '@/lib/taxonomy/taxonomyPaths';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import { useRouter } from 'next/navigation';
import { tagsColumns } from './tagsColumns';

const SORT_OPTIONS = [
  { value: 'sortOrder' as const, label: 'Sort order' },
  { value: 'name' as const, label: 'Name' },
  { value: 'posts' as const, label: 'Most posts' },
];

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export default function TagsPage() {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [items, setItems] = useState<AdminBlogTagListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortValue>('sortOrder');
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const columns = useMemo(() => tagsColumns, []);
  const canManage = hasPermission('blog_tag:manage');

  const load = useCallback(async () => {
    if (!apiToken) return;
    setLoading(true);
    setError(null);
    try {
      const r = await listBlogTags(apiToken, {
        q: search.trim().length >= 1 ? search.trim() : undefined,
        sort,
      });
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, [apiToken, search, sort]);

  useEffect(() => {
    if (!apiToken) return;
    const delay = search.trim().length >= 2 ? 300 : 0;
    const t = setTimeout(() => void load(), delay);
    return () => clearTimeout(t);
  }, [apiToken, search, sort, load]);

  async function onBulkCreate(csvText: string) {
    if (!apiToken) return;
    const { rows, parseError } = parseTaxonomyCsv(csvText, 'tag');
    if (parseError) {
      setError(parseError);
      return;
    }
    const payload = taxonomyRowsToPayload(rows);
    if (payload.length === 0) {
      setError('No valid tags to import.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await bulkCreateBlogTags(apiToken, payload);
      setBulkOpen(false);
      await load();
      if (result.failed.length > 0) {
        const failedNames = result.failed.map((f) => f.name || `#${f.index + 1}`).join(', ');
        setError(`Added ${result.created.length} tags. ${result.failed.length} failed: ${failedNames}`);
      } else {
        setSuccess(`Added ${result.created.length} tags.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk import failed');
    } finally {
      setSaving(false);
    }
  }

  async function onCreate(values: TaxonomyFormValues) {
    if (!apiToken) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createBlogTag(apiToken, {
        name: values.name.trim(),
        description: values.description.trim(),
        sortOrder: Number(values.sortOrder) || 0,
      });
      setCreateOpen(false);
      router.push(tagDetailPath(created.slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tag');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="Tags"
        description="Curated blog tags and how many published posts use each tag."
        icon={<LabelRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Tags', '/tags')}
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}
      {success ? (
        <AdminFeedbackMessage severity="success" message={success} onClose={() => setSuccess(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="All tags"
        right={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 400 } }}
          >
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search name or slug"
              sx={{ minWidth: { xs: '100%', sm: 220 }, flex: 1 }}
            />
            <AdminFilterSelect
              aria-label="Sort tags"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
            />
            {canManage ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PlaylistAddRoundedIcon />}
                  onClick={() => setBulkOpen(true)}
                  sx={{ flexShrink: 0 }}
                >
                  Bulk add
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setCreateOpen(true)}
                  sx={{ flexShrink: 0 }}
                >
                  Add tag
                </Button>
              </>
            ) : null}
          </Stack>
        }
      />

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading && items.length === 0}
        getRowId={(row) => row.id}
        emptyMessage="No tags found."
        totalLabel="tags"
        pageSize={25}
        dense
      />

      <BlogTaxonomyFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        kind="tag"
        mode="create"
        saving={saving}
        onSubmit={onCreate}
      />

      <BulkTagsDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        saving={saving}
        onSubmit={onBulkCreate}
      />
    </Stack>
  );
}
