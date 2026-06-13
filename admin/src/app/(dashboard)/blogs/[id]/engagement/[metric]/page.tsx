'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import {
  getBlogEngagement,
  type AdminBlogEngagementResponse,
  type AdminBlogEngagementRow,
} from '@/admin';
import { blogEngagementColumns } from '@/components/blogs/blogEngagementColumns';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { blogEngagementBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminFilterSelect } from '@/components/ui/AdminFilterSelect';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import {
  BLOG_ENGAGEMENT_LABELS,
  isBlogEngagementMetric,
  type BlogEngagementMetric,
} from '@/lib/blogs/blogEngagementPaths';
import { blogDetailPath } from '@/lib/users/userProfilePath';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

const VIEWER_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All viewers' },
  { value: 'user' as const, label: 'Logged in' },
  { value: 'anonymous' as const, label: 'Not logged in' },
];

type ViewerFilter = (typeof VIEWER_FILTER_OPTIONS)[number]['value'];

function filterEngagementRows(
  items: AdminBlogEngagementRow[],
  search: string,
  viewerFilter: ViewerFilter
): AdminBlogEngagementRow[] {
  const q = search.trim().toLowerCase();
  return items.filter((row) => {
    if (viewerFilter !== 'all' && row.kind !== viewerFilter) return false;
    if (!q) return true;
    const hay = [row.username, row.fullName, row.textPreview]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

function BlogEngagementInner() {
  const params = useParams();
  const postId = typeof params.id === 'string' ? params.id : '';
  const metricRaw = typeof params.metric === 'string' ? params.metric : '';
  const metric: BlogEngagementMetric | null = isBlogEngagementMetric(metricRaw)
    ? metricRaw
    : null;

  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [data, setData] = useState<AdminBlogEngagementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewerFilter, setViewerFilter] = useState<ViewerFilter>('all');

  const load = useCallback(async () => {
    if (!apiToken || !postId || !metric) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBlogEngagement(apiToken, postId, metric, { limit: 100 });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load engagement');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiToken, postId, metric]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(
    () => blogEngagementColumns({ showComment: metric === 'comments' }),
    [metric]
  );

  const label = metric ? BLOG_ENGAGEMENT_LABELS[metric] : 'Engagement';
  const postTitle = data?.postTitle ?? 'Blog';

  const filteredItems = useMemo(
    () => filterEngagementRows(data?.items ?? [], search, viewerFilter),
    [data?.items, search, viewerFilter]
  );

  const viewsNote =
    metric === 'views' && data
      ? data.anonymousEstimate && data.anonymousEstimate > 0
        ? `Showing up to ${data.items.filter((i) => i.kind === 'anonymous').length} anonymous rows (estimated ${data.anonymousEstimate.toLocaleString()} unlogged views). Logged-in events: ${data.loggedInCount ?? 0}.`
        : null
      : null;

  if (!metric) {
    return (
      <Stack spacing={2}>
        <AdminFeedbackMessage severity="error" message="Unknown engagement metric." />
        <Button component={Link} href={blogDetailPath(postId)} variant="outlined" size="small">
          Back to blog
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title={`${label} · ${postTitle}`}
        description={
          data
            ? `${data.total.toLocaleString()} total ${label.toLowerCase()}`
            : `Engagement list for this post`
        }
        breadcrumbs={blogEngagementBreadcrumbs(postTitle, postId, label)}
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      {viewsNote ? (
        <Typography variant="body2" color="text.secondary">
          {viewsNote}
        </Typography>
      ) : null}

      <AdminBlinkSectionHeader
        title={label}
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
              placeholder="Search user or comment"
              sx={{ minWidth: { xs: '100%', sm: 240 }, maxWidth: { sm: 360 }, flex: 1 }}
            />
            {metric === 'views' ? (
              <AdminFilterSelect
                aria-label="Viewer type"
                value={viewerFilter}
                onChange={setViewerFilter}
                options={VIEWER_FILTER_OPTIONS}
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
              />
            ) : (
              <AdminFilterSelect
                aria-label="Viewer type"
                value={viewerFilter}
                onChange={setViewerFilter}
                options={[
                  { value: 'all' as const, label: 'All users' },
                  { value: 'user' as const, label: 'Logged in only' },
                ]}
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
              />
            )}
          </Stack>
        }
      />

      <AdminDataTable
        data={filteredItems}
        columns={columns}
        loading={loading && !data}
        getRowId={(row) => row.id}
        emptyMessage={`No ${label.toLowerCase()} match your filters.`}
        totalLabel={label.toLowerCase()}
        pageSize={25}
        dense
      />

      <Box>
        <Button component={Link} href={blogDetailPath(postId)} variant="outlined" size="small">
          Back to blog
        </Button>
      </Box>
    </Stack>
  );
}

export default function BlogEngagementPage() {
  return (
    <Suspense fallback={null}>
      <BlogEngagementInner />
    </Suspense>
  );
}
