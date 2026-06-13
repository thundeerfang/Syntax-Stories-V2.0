'use client';

import { useState } from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ImageNotSupportedRoundedIcon from '@mui/icons-material/ImageNotSupportedRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import SubjectRoundedIcon from '@mui/icons-material/SubjectRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import UpdateRoundedIcon from '@mui/icons-material/UpdateRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import type { AdminBlogDetailResponse, AdminUserPostDetail } from '@/admin';
import { AdminPanelEmptyState } from '@/components/ui/AdminPanelEmptyState';
import { AdminSidebarNav } from '@/components/ui/AdminSidebarNav';
import { BlogDetailStatCard } from '@/components/users/BlogDetailStatCard';
import { isEmptyBlogContent } from '@/lib/blogs/isEmptyBlogContent';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';
import { resolveProfileMediaUrl } from '@/lib/users/resolveProfileMediaUrl';

const DETAIL_NAV = [
  { label: 'Overview', icon: DashboardRoundedIcon },
  { label: 'Content', icon: ArticleRoundedIcon },
  { label: 'Blocks', icon: LayersRoundedIcon },
  { label: 'Images', icon: ImageRoundedIcon },
] as const;

function OverviewSection({ post }: { post: AdminUserPostDetail }) {
  return (
    <Stack spacing={2.5}>
      {(post.category || post.tags.length > 0) ? (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {post.category ? <Chip size="small" label={post.category} variant="outlined" /> : null}
          {post.tags.map((t) => (
            <Chip key={t} size="small" label={t} variant="outlined" />
          ))}
        </Stack>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <BlogDetailStatCard
            label="Summary"
            value={post.summary?.trim() || null}
            icon={<NotesRoundedIcon />}
            empty={!post.summary?.trim()}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard label="Slug" value={post.slug} icon={<LinkRoundedIcon />} mono />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard label="Language" value={post.language} icon={<TranslateRoundedIcon />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard
            label="Published"
            value={formatUserDetailDate(post.publishedAt)}
            icon={<EventAvailableRoundedIcon />}
            empty={!post.publishedAt}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard
            label="Created"
            value={formatUserDetailDate(post.createdAt)}
            icon={<CalendarTodayRoundedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard
            label="Updated"
            value={formatUserDetailDate(post.updatedAt)}
            icon={<UpdateRoundedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard
            label="Last edited"
            value={formatUserDetailDate(post.lastEditedAt)}
            icon={<EditCalendarRoundedIcon />}
            empty={!post.lastEditedAt}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard
            label="Blocks"
            value={post.blockSummaries.length.toLocaleString()}
            icon={<LayersRoundedIcon />}
            empty={post.blockSummaries.length === 0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard
            label="Images"
            value={post.images.length.toLocaleString()}
            icon={<ImageRoundedIcon />}
            empty={post.images.length === 0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <BlogDetailStatCard
            label="Squad"
            value={post.squadId}
            icon={<GroupsRoundedIcon />}
            mono
            empty={!post.squadId}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

function ContentSection({ post }: { post: AdminUserPostDetail }) {
  const contentEmpty = isEmptyBlogContent(post.content);

  return (
    <Stack spacing={2}>
      {post.textExcerpt ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
            Text excerpt (paragraphs & headings)
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {post.textExcerpt}
          </Typography>
        </Paper>
      ) : (
        <AdminPanelEmptyState
          icon={<SubjectRoundedIcon />}
          title="No readable text blocks in this post."
        />
      )}
      {contentEmpty ? (
        <AdminPanelEmptyState
          icon={<DataObjectRoundedIcon />}
          title="No content"
          description="Raw content JSON is empty."
        />
      ) : (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, maxHeight: 360, overflow: 'auto' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
            Raw content JSON
          </Typography>
          <Typography
            component="pre"
            variant="caption"
            sx={{ m: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {post.content.length > 120_000
              ? `${post.content.slice(0, 120_000)}… [truncated]`
              : post.content}
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}

function BlocksSection({ post }: { post: AdminUserPostDetail }) {
  if (post.blockSummaries.length === 0) {
    return (
      <AdminPanelEmptyState icon={<LayersRoundedIcon />} title="No blocks in content." />
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Id</TableCell>
            <TableCell>Section</TableCell>
            <TableCell>Preview</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {post.blockSummaries.map((b) => (
            <TableRow key={`${b.index}-${b.id}`}>
              <TableCell>{b.index}</TableCell>
              <TableCell>
                <Chip size="small" label={b.type} variant="outlined" />
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{b.id}</TableCell>
              <TableCell>{b.sectionId ?? '—'}</TableCell>
              <TableCell sx={{ maxWidth: 320 }}>
                <Typography variant="body2" color="text.secondary" noWrap title={b.preview}>
                  {b.preview}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ImagesSection({
  post,
  username,
}: {
  post: AdminUserPostDetail;
  username: string;
}) {
  if (post.images.length === 0) {
    return (
      <AdminPanelEmptyState
        icon={<ImageNotSupportedRoundedIcon />}
        title="No images or thumbnail on this post."
      />
    );
  }

  return (
    <Grid container spacing={2}>
      {post.images.map((img) => (
        <Grid key={img.url} size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              component="img"
              src={resolveProfileMediaUrl(img.url, username)}
              alt=""
              sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
            />
            <Box sx={{ p: 1.5 }}>
              <Chip
                size="small"
                label={img.source === 'thumbnail' ? 'Thumbnail' : img.blockType ?? 'Block'}
                sx={{ mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', display: 'block' }}>
                {img.url}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

export function UserPostDetailPanel({ data }: { data: AdminBlogDetailResponse }) {
  const [section, setSection] = useState(0);
  const { post, author } = data;

  return (
    <AdminSidebarNav items={[...DETAIL_NAV]} value={section} onChange={setSection}>
      {section === 0 ? <OverviewSection post={post} /> : null}
      {section === 1 ? <ContentSection post={post} /> : null}
      {section === 2 ? <BlocksSection post={post} /> : null}
      {section === 3 ? <ImagesSection post={post} username={author.username} /> : null}
    </AdminSidebarNav>
  );
}
