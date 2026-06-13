'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Grid from '@mui/material/Grid2';
import { Button, Stack, Typography } from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import Link from 'next/link';
import {
  getBlogCategory,
  updateBlogCategory,
  type AdminBlogCategoryDetail,
} from '@/admin';
import { BlogTaxonomyFormDialog, type TaxonomyFormValues } from '@/components/taxonomy/BlogTaxonomyFormDialog';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { SecurityStatTile } from '@/components/settings/SecurityStatTile';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { blogDetailPath } from '@/lib/users/userProfilePath';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import type { ColumnDef } from '@tanstack/react-table';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';

type RecentRow = AdminBlogCategoryDetail['recentPosts'][number];

function CategoryDetailInner() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [data, setData] = useState<AdminBlogCategoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!apiToken || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getBlogCategory(apiToken, slug);
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load category');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiToken, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const postColumns = useMemo<ColumnDef<RecentRow, unknown>[]>(
    () => [
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => (
          <Typography variant="body2" fontWeight={600} noWrap>
            {row.original.title}
          </Typography>
        ),
      },
      {
        id: 'author',
        header: 'Author',
        accessorFn: (r) => r.authorUsername,
        cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            @{row.original.authorUsername || 'unknown'}
          </Typography>
        ),
      },
      {
        id: 'published',
        header: 'Published',
        accessorKey: 'publishedAt',
        cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatUserDetailDate(row.original.publishedAt)}
          </Typography>
        ),
      },
      {
        id: 'open',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            component={Link}
            href={blogDetailPath(row.original.id)}
            size="small"
            variant="outlined"
          >
            Open
          </Button>
        ),
      },
    ],
    []
  );

  async function onSave(values: TaxonomyFormValues) {
    if (!apiToken || !data) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateBlogCategory(apiToken, data.slug, {
        name: values.name.trim(),
        description: values.description.trim(),
        sortOrder: Number(values.sortOrder) || 0,
      });
      setData(updated);
      setEditOpen(false);
      if (updated.slug !== slug) {
        router.replace(`/categories/${encodeURIComponent(updated.slug)}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update category');
    } finally {
      setSaving(false);
    }
  }

  const title = data?.name ?? slug;

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title={title}
        description={data?.description || 'Blog category'}
        icon={<FolderRoundedIcon />}
        breadcrumbs={[
          { label: 'Home', href: '/', home: true },
          { label: 'Categories', href: '/categories' },
          { label: title },
        ]}
        actions={
          hasPermission('blog_category:manage') && data ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditRoundedIcon />}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
          ) : null
        }
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      {loading && !data ? (
        <Typography variant="body2" color="text.secondary">
          Loading category…
        </Typography>
      ) : null}

      {data ? (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <SecurityStatTile
                icon={ArticleRoundedIcon}
                label="Published posts"
                value={data.postCount.toLocaleString()}
                tone="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <SecurityStatTile
                icon={PeopleRoundedIcon}
                label="Followers"
                value={data.followerCount.toLocaleString()}
                tone="neutral"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <SecurityStatTile
                icon={FolderRoundedIcon}
                label="Draft posts"
                value={data.draftCount.toLocaleString()}
                tone="neutral"
              />
            </Grid>
          </Grid>

          <AdminBlinkSectionHeader title="Recent posts in this category" />

          <AdminDataTable
            data={data.recentPosts}
            columns={postColumns}
            loading={false}
            getRowId={(row) => row.id}
            emptyMessage="No published posts in this category yet."
            totalLabel="posts"
            pageSize={10}
            dense
          />

          <BlogTaxonomyFormDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            kind="category"
            mode="edit"
            saving={saving}
            initial={{
              slug: data.slug,
              name: data.name,
              description: data.description,
              sortOrder: String(data.sortOrder),
            }}
            onSubmit={onSave}
          />
        </>
      ) : null}
    </Stack>
  );
}

export default function CategoryDetailPage() {
  return (
    <Suspense fallback={null}>
      <CategoryDetailInner />
    </Suspense>
  );
}
