'use client';

import Link from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import type { AdminUserPostSummary } from '@/admin';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';
import { resolveProfileMediaUrl } from '@/lib/users/resolveProfileMediaUrl';
import { blogDetailPath } from '@/lib/users/userProfilePath';

export function UserPostCard({
  post,
  username,
}: {
  post: AdminUserPostSummary;
  username: string;
}) {
  const theme = useTheme();
  const thumb = post.thumbnailUrl
    ? resolveProfileMediaUrl(post.thumbnailUrl, username)
    : null;
  const href = blogDetailPath(post.id);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        height: '100%',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
        },
      }}
    >
      <CardActionArea component={Link} href={href} sx={{ height: '100%', alignItems: 'stretch' }}>
        {thumb ? (
          <Box
            component="img"
            src={thumb}
            alt=""
            sx={{
              width: '100%',
              height: 140,
              objectFit: 'cover',
              bgcolor: alpha(theme.palette.divider, 0.3),
            }}
          />
        ) : (
          <Box
            sx={{
              height: 100,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              No thumbnail
            </Typography>
          </Box>
        )}
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {post.title}
              </Typography>
              <Chip
                size="small"
                label={post.status}
                color={post.status === 'published' ? 'success' : 'default'}
                variant={post.status === 'published' ? 'filled' : 'outlined'}
                sx={{ flexShrink: 0 }}
              />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1.5} color="text.secondary">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <VisibilityRoundedIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption">{post.viewCount.toLocaleString()}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <FavoriteRoundedIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption">{post.respectCount.toLocaleString()}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption">{post.commentCount.toLocaleString()}</Typography>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Updated {formatUserDetailDate(post.updatedAt ?? post.publishedAt)}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
