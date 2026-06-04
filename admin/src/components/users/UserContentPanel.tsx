'use client';

import { useState } from 'react';
import {
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import DraftsRoundedIcon from '@mui/icons-material/DraftsRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import Grid from '@mui/material/Grid2';
import type { AdminUserDetail, AdminUserEngagementItem } from '@/admin';
import { AdminSidebarNav } from '@/components/ui/AdminSidebarNav';
import { UserContentStatBadge } from '@/components/users/UserContentStatBadge';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';
import { publicBlogPostUrl } from '@/lib/users/publicBlogPostUrl';
import { UserPostCard } from './UserPostCard';

const EMPTY_ACTIVITY: NonNullable<AdminUserDetail['activity']> = {
  counts: {
    postsPublished: 0,
    postsDraft: 0,
    comments: 0,
    reposts: 0,
    respectsGiven: 0,
    bookmarks: 0,
  },
  recent: { posts: [], comments: [], reposts: [], respects: [], bookmarks: [] },
};

const CONTENT_NAV = [
  { label: 'Posts', icon: ArticleRoundedIcon },
  { label: 'Comments', icon: ChatBubbleOutlineRoundedIcon },
  { label: 'Reposts', icon: RepeatRoundedIcon },
  { label: 'Respects', icon: FavoriteRoundedIcon },
  { label: 'Bookmarks', icon: BookmarkRoundedIcon },
] as const;

function EngagementList({
  rows,
  username,
  emptyMessage,
  showPreview,
}: {
  rows: AdminUserEngagementItem[];
  username: string;
  emptyMessage: string;
  showPreview?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {rows.map((row) => {
        const href = publicBlogPostUrl(row.postAuthorUsername || username, row.postSlug);
        return (
          <Paper key={`${row.postId}-${row.createdAt}-${row.commentId ?? ''}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={0.75}>
              <MuiLink
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                fontWeight={700}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                {row.postTitle}
                <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
              </MuiLink>
              {showPreview && row.textPreview ? (
                <Typography variant="body2" color="text.secondary">
                  {row.textPreview}
                </Typography>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                {formatUserDetailDate(row.createdAt)}
              </Typography>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

function PostsGrid({ user }: { user: AdminUserDetail }) {
  const posts = user.activity?.recent.posts ?? [];
  if (posts.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No posts yet.
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {posts.map((post) => (
        <Grid key={post.id} size={{ xs: 12, sm: 6, lg: 4 }}>
          <UserPostCard post={post} username={user.username} />
        </Grid>
      ))}
    </Grid>
  );
}

export function UserContentPanel({ user }: { user: AdminUserDetail }) {
  const [section, setSection] = useState(0);
  const activity = user.activity ?? EMPTY_ACTIVITY;
  const { counts, recent } = activity;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        <UserContentStatBadge
          label="Published"
          count={counts.postsPublished}
          icon={<ArticleRoundedIcon fontSize="inherit" />}
          tone="success"
        />
        <UserContentStatBadge
          label="Drafts"
          count={counts.postsDraft}
          icon={<DraftsRoundedIcon fontSize="inherit" />}
          tone="warning"
        />
        <UserContentStatBadge
          label="Comments"
          count={counts.comments}
          icon={<ChatBubbleOutlineRoundedIcon fontSize="inherit" />}
          tone="info"
        />
        <UserContentStatBadge
          label="Reposts"
          count={counts.reposts}
          icon={<RepeatRoundedIcon fontSize="inherit" />}
        />
        <UserContentStatBadge
          label="Respects"
          count={counts.respectsGiven}
          icon={<FavoriteRoundedIcon fontSize="inherit" />}
          tone="primary"
        />
        <UserContentStatBadge
          label="Bookmarks"
          count={counts.bookmarks}
          icon={<BookmarkRoundedIcon fontSize="inherit" />}
        />
      </Stack>

      <AdminSidebarNav items={[...CONTENT_NAV]} value={section} onChange={setSection}>
        {section === 0 ? <PostsGrid user={user} /> : null}
        {section === 1 ? (
          <EngagementList
            rows={recent.comments}
            username={user.username}
            showPreview
            emptyMessage="No comments yet."
          />
        ) : null}
        {section === 2 ? (
          <EngagementList rows={recent.reposts} username={user.username} emptyMessage="No reposts yet." />
        ) : null}
        {section === 3 ? (
          <EngagementList rows={recent.respects} username={user.username} emptyMessage="No respects given yet." />
        ) : null}
        {section === 4 ? (
          <EngagementList rows={recent.bookmarks} username={user.username} emptyMessage="No bookmarks yet." />
        ) : null}
      </AdminSidebarNav>
    </Stack>
  );
}
