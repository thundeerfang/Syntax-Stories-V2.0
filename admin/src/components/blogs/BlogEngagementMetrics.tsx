'use client';

import type { ComponentType } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Link from 'next/link';
import type { AdminUserPostDetail } from '@/admin';
import {
  BLOG_ENGAGEMENT_LABELS,
  blogEngagementPath,
  type BlogEngagementMetric,
} from '@/lib/blogs/blogEngagementPaths';

function ThunderIcon({ size = 22 }: { size?: number }) {
  return (
    <Box
      component="img"
      src="/svg/icons8-lightning-bolt.svg"
      alt=""
      sx={{ width: size, height: size, display: 'block' }}
    />
  );
}

const METRICS: {
  key: BlogEngagementMetric;
  countKey: keyof Pick<
    AdminUserPostDetail,
    'viewCount' | 'respectCount' | 'commentCount' | 'repostCount' | 'bookmarkCount'
  >;
  Icon: ComponentType;
}[] = [
  { key: 'views', countKey: 'viewCount', Icon: VisibilityRoundedIcon },
  { key: 'respects', countKey: 'respectCount', Icon: ThunderIcon },
  { key: 'comments', countKey: 'commentCount', Icon: ChatBubbleOutlineRoundedIcon },
  { key: 'reposts', countKey: 'repostCount', Icon: RepeatRoundedIcon },
  { key: 'bookmarks', countKey: 'bookmarkCount', Icon: BookmarkRoundedIcon },
];

export function BlogEngagementMetrics({
  post,
  postId,
}: {
  post: AdminUserPostDetail;
  postId: string;
}) {
  const theme = useTheme();

  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.25}>
      {METRICS.map(({ key, countKey, Icon }) => (
        <Paper
          key={key}
          component={Link}
          href={blogEngagementPath(postId, key)}
          variant="outlined"
          sx={{
            minWidth: 100,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            textAlign: 'center',
            textDecoration: 'none',
            color: 'inherit',
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: 1,
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              color: 'primary.main',
              mb: 0.5,
              '& svg': { fontSize: 22 },
            }}
          >
            <Icon />
          </Box>
          <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
            {post[countKey].toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {BLOG_ENGAGEMENT_LABELS[key]}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}
