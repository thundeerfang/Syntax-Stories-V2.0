'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import {
  bulkCreateBlogCategories,
  createBlogCategory,
  listBlogCategories,
  type AdminBlogCategoryListItem,
} from '@/admin';
import { BlogTaxonomyFormDialog, type TaxonomyFormValues } from '@/components/taxonomy/BlogTaxonomyFormDialog';
import { BulkCategoriesDialog } from '@/components/taxonomy/BulkCategoriesDialog';
import { categoryRowsToPayload, parseCategoryCsv } from '@/lib/taxonomy/parseCategoryCsv';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFilterSelect } from '@/components/ui/AdminFilterSelect';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { categoryDetailPath } from '@/lib/taxonomy/taxonomyPaths';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import { useRouter } from 'next/navigation';
import { categoriesColumns } from './categoriesColumns';

const SORT_OPTIONS = [
  { value: 'sortOrder' as const, label: 'Sort order' },
  { value: 'name' as const, label: 'Name' },
  { value: 'posts' as const, label: 'Most posts' },
  { value: 'followers' as const, label: 'Most followers' },
];

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export default function CategoriesPage() {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [items, setItems] = useState<AdminBlogCategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortValue>('sortOrder');
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const columns = useMemo(() => categoriesColumns, []);
  const canManage = hasPermission('blog_category:manage');

  const load = useCallback(async () => {
    if (!apiToken) return;
    setLoading(true);
    setError(null);
    try {
      const r = await listBlogCategories(apiToken, {
        q: search.trim().length >= 1 ? search.trim() : undefined,
        sort,
      });
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
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
    const { rows, parseError } = parseCategoryCsv(csvText);
    if (parseError) {
      setError(parseError);
      return;
    }
    const payload = categoryRowsToPayload(rows);
    if (payload.length === 0) {
      setError('No valid categories to import.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await bulkCreateBlogCategories(apiToken, payload);
      setBulkOpen(false);
      await load();
      if (result.failed.length > 0) {
        const failedNames = result.failed.map((f) => f.name || `#${f.index + 1}`).join(', ');
        setError(
          `Added ${result.created.length} categories. ${result.failed.length} failed: ${failedNames}`
        );
      } else {
        setSuccess(`Added ${result.created.length} categories.`);
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
      const created = await createBlogCategory(apiToken, {
        name: values.name.trim(),
        description: values.description.trim(),
        sortOrder: Number(values.sortOrder) || 0,
      });
      setCreateOpen(false);
      router.push(categoryDetailPath(created.slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="Categories"
        description="Curated blog categories, follower counts, and published posts per category."
        icon={<FolderRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Categories', '/categories')}
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}
      {success ? (
        <AdminFeedbackMessage severity="success" message={success} onClose={() => setSuccess(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="All categories"
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
              aria-label="Sort categories"
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
                  Add category
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
        emptyMessage="No categories found."
        totalLabel="categories"
        pageSize={25}
        dense
      />

      <BlogTaxonomyFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        kind="category"
        mode="create"
        saving={saving}
        onSubmit={onCreate}
      />

      <BulkCategoriesDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        saving={saving}
        onSubmit={onBulkCreate}
      />
    </Stack>
  );
}
