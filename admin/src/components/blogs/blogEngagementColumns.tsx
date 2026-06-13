'use client';

import { Avatar, Chip, Stack, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminBlogEngagementRow } from '@/admin';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';
import { resolveProfileMediaUrl } from '@/lib/users/resolveProfileMediaUrl';
import { userProfilePath } from '@/lib/users/userProfilePath';
import Link from 'next/link';

function ViewerCell({ row }: { row: AdminBlogEngagementRow }) {
  if (row.kind === 'anonymous') {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.hover', color: 'text.disabled' }}>
          ?
        </Avatar>
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={600}>
            {row.fullName ?? 'Anonymous visitor'}
          </Typography>
          <Chip size="small" label="Not logged in" variant="outlined" sx={{ width: 'fit-content' }} />
        </Stack>
      </Stack>
    );
  }

  const label = row.username ? `@${row.username}` : row.fullName ?? 'Unknown user';
  const avatarSrc = row.profileImg
    ? resolveProfileMediaUrl(row.profileImg, row.username ?? '')
    : undefined;

  const inner = (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar src={avatarSrc} sx={{ width: 32, height: 32 }}>
        {(row.username ?? row.fullName ?? '?').charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
  );

  if (row.userRef) {
    return (
      <Link href={userProfilePath(row.userRef)} style={{ textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </Link>
    );
  }

  return inner;
}

export function blogEngagementColumns(opts?: {
  showComment?: boolean;
}): ColumnDef<AdminBlogEngagementRow>[] {
  const cols: ColumnDef<AdminBlogEngagementRow>[] = [
    {
      id: 'viewer',
      header: 'User',
      cell: ({ row }) => <ViewerCell row={row.original} />,
    },
    {
      id: 'when',
      header: 'When',
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">
          {row.original.createdAt ? formatUserDetailDate(row.original.createdAt) : '—'}
        </Typography>
      ),
    },
  ];

  if (opts?.showComment) {
    cols.push({
      id: 'comment',
      header: 'Comment',
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {row.original.textPreview ?? '—'}
        </Typography>
      ),
    });
  }

  return cols;
}
