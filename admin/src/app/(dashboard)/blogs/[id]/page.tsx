'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import Link from 'next/link';
import { getBlog, type AdminBlogDetailResponse } from '@/admin';
import { BlogModerationActions } from '@/components/blogs/BlogModerationActions';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { BlogAuthorButton } from '@/components/blogs/BlogAuthorButton';
import { BlogEngagementMetrics } from '@/components/blogs/BlogEngagementMetrics';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { HOME_BREADCRUMB } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { BlogPostStatusBadge } from '@/components/ui/BlogPostStatusBadge';
import { UserPostDetailPanel } from '@/components/users/UserPostDetailPanel';
import { publicBlogPostUrl } from '@/lib/users/publicBlogPostUrl';
import { useSessionStore } from '@/store/session';

function BlogDetailInner() {
  const params = useParams();
  const postId = typeof params.id === 'string' ? params.id : '';

  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [data, setData] = useState<AdminBlogDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!apiToken || !postId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBlog(apiToken, postId);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load blog');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiToken, postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = data?.post.title ?? 'Blog';
  const publicUrl =
    data?.post.status === 'published' &&
    !data.post.deletedAt &&
    data.author.username
      ? publicBlogPostUrl(data.author.username, data.post.slug)
      : null;

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title={title}
        description={
          data
            ? `${data.post.blockSummaries.length} blocks · ${data.post.images.length} images`
            : 'Blog post details'
        }
        icon={<ArticleRoundedIcon />}
        iconAccessory={
          publicUrl ? (
            <Tooltip title="View on webapp">
              <IconButton
                component={Link}
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                color="primary"
                aria-label="View published post on webapp"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <OpenInNewRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : null
        }
        breadcrumbs={[
          HOME_BREADCRUMB,
          { label: 'Blogs', href: '/blogs' },
          { label: title },
        ]}
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      {loading && !data ? (
        <Typography variant="body2" color="text.secondary">
          Loading blog…
        </Typography>
      ) : null}

      {data ? (
        <>
          <BlogEngagementMetrics post={data.post} postId={postId} />

          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} alignItems="center">
            <BlogPostStatusBadge
              status={data.post.deletedAt ? 'draft' : data.post.status}
            />
            {data.post.deletedAt ? (
              <Typography variant="caption" color="warning.main" fontWeight={600}>
                Soft-deleted
              </Typography>
            ) : null}
            <BlogAuthorButton
              authorRef={data.author.ref}
              username={data.author.username}
              fullName={data.author.fullName}
              profileImg={data.author.profileImg}
            />
          </Stack>

          <BlogModerationActions
            token={apiToken}
            postId={postId}
            postTitle={data.post.title}
            status={data.post.status}
            deletedAt={data.post.deletedAt}
            authorEmail={data.author.email}
            onChanged={() => void load()}
          />

          <UserPostDetailPanel data={data} />
        </>
      ) : null}

      {!loading && !data && !error ? (
        <Stack spacing={2}>
          <AdminFeedbackMessage severity="warning" message="Blog not found." />
          <Button component={Link} href="/blogs" variant="outlined" size="small">
            Back to blogs
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

export default function BlogDetailPage() {
  return (
    <Suspense fallback={null}>
      <BlogDetailInner />
    </Suspense>
  );
}
