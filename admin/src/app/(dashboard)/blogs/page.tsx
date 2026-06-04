'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import { listBlogs, type AdminBlogListItem } from '@/admin';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFilterSelect } from '@/components/ui/AdminFilterSelect';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import { useSessionStore } from '@/store/session';
import { blogsColumns } from './blogsColumns';

const BLOG_STATUS_OPTIONS = [
  { value: 'all' as const, label: 'All statuses' },
  { value: 'published' as const, label: 'Published' },
  { value: 'draft' as const, label: 'Draft' },
];

type BlogStatusFilter = (typeof BLOG_STATUS_OPTIONS)[number]['value'];

export default function BlogsPage() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [items, setItems] = useState<AdminBlogListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<BlogStatusFilter>('all');
  const [search, setSearch] = useState('');

  const columns = useMemo(() => blogsColumns, []);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!apiToken) return;
      setLoading(true);
      setError(null);
      try {
        const r = await listBlogs(apiToken, {
          limit: 30,
          cursor: cursor ?? undefined,
          status: status === 'all' ? undefined : status,
          q: search.trim().length >= 2 ? search.trim() : undefined,
        });
        if (cursor) {
          setItems((prev) => [...prev, ...r.items]);
        } else {
          setItems(r.items);
        }
        setNextCursor(r.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load blogs');
      } finally {
        setLoading(false);
      }
    },
    [apiToken, status, search]
  );

  useEffect(() => {
    if (!apiToken) return;
    const delay = search.trim().length >= 2 ? 300 : 0;
    const t = setTimeout(() => {
      void load();
    }, delay);
    return () => clearTimeout(t);
  }, [apiToken, status, search, load]);

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="Blogs"
        description="All posts across the platform. Open a row for blocks, images, content, and engagement."
        icon={<ArticleRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Blogs', '/blogs')}
      />

      <AdminBlinkSectionHeader
        title="All blogs"
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
              placeholder="Search title or slug"
              sx={{ minWidth: { xs: '100%', sm: 240 }, maxWidth: { sm: 360 }, flex: 1 }}
            />
            <AdminFilterSelect
              aria-label="Status"
              value={status}
              onChange={setStatus}
              options={BLOG_STATUS_OPTIONS}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
            />
          </Stack>
        }
      />

      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading && items.length === 0}
        getRowId={(row) => row.id}
        emptyMessage="No blogs found."
        totalLabel="blogs"
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
