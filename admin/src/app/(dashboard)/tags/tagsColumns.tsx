'use client';

import Link from 'next/link';
import { Button, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminBlogTagListItem } from '@/admin';
import { tagDetailPath } from '@/lib/taxonomy/taxonomyPaths';

export const tagsColumns: ColumnDef<AdminBlogTagListItem, unknown>[] = [
  {
    id: 'name',
    header: 'Tag',
    accessorKey: 'name',
    cell: ({ row }) => (
      <Typography variant="body2" fontWeight={700} noWrap title={row.original.name}>
        {row.original.name}
      </Typography>
    ),
  },
  {
    id: 'slug',
    header: 'Slug',
    accessorKey: 'slug',
    cell: ({ row }) => (
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
        {row.original.slug}
      </Typography>
    ),
  },
  {
    id: 'posts',
    header: 'Posts using tag',
    accessorKey: 'postCount',
    cell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {row.original.postCount.toLocaleString()}
      </Typography>
    ),
  },
  {
    id: 'sort',
    header: 'Order',
    accessorKey: 'sortOrder',
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <Button component={Link} href={tagDetailPath(row.original.slug)} size="small" variant="outlined">
        Open
      </Button>
    ),
  },
];
