'use client';

import Link from 'next/link';
import { Button, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminBlogListItem } from '@/admin';
import { BlogPostStatusBadge } from '@/components/ui/BlogPostStatusBadge';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';
import { blogDetailPath, userProfilePath } from '@/lib/users/userProfilePath';

export const blogsColumns: ColumnDef<AdminBlogListItem, unknown>[] = [
  {
    id: 'title',
    header: 'Title',
    accessorKey: 'title',
    cell: ({ row }) => (
      <Typography variant="body2" fontWeight={700} noWrap title={row.original.title}>
        {row.original.title}
      </Typography>
    ),
  },
  {
    id: 'author',
    header: 'Author',
    accessorFn: (r) => r.authorUsername,
    cell: ({ row }) => {
      const { authorRef, authorUsername, authorFullName } = row.original;
      const label = authorFullName ? `${authorFullName} (@${authorUsername})` : `@${authorUsername}`;
      if (authorRef) {
        return (
          <Typography
            component={Link}
            href={userProfilePath(authorRef)}
            variant="body2"
            fontWeight={600}
            sx={{ textDecoration: 'none', color: 'primary.main' }}
          >
            {label}
          </Typography>
        );
      }
      return <Typography variant="body2">{label || '—'}</Typography>;
    },
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => <BlogPostStatusBadge status={row.original.status} />,
  },
  {
    id: 'stats',
    header: 'Views / respects / comments',
    enableSorting: false,
    cell: ({ row }) => (
      <Typography variant="caption" color="text.secondary">
        {row.original.viewCount.toLocaleString()} · {row.original.respectCount.toLocaleString()} ·{' '}
        {row.original.commentCount.toLocaleString()}
      </Typography>
    ),
  },
  {
    id: 'updated',
    header: 'Updated',
    accessorFn: (r) => r.updatedAt ?? r.publishedAt ?? '',
    cell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {formatUserDetailDate(row.original.updatedAt ?? row.original.publishedAt)}
      </Typography>
    ),
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <Button component={Link} href={blogDetailPath(row.original.id)} size="small" variant="outlined">
        Open
      </Button>
    ),
  },
];
