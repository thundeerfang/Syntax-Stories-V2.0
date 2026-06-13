'use client';

import Link from 'next/link';
import { Button, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import type { ContactLeadListItem } from '@/lib/api';

export const contactLeadsColumns: ColumnDef<ContactLeadListItem, unknown>[] = [
  {
    id: 'submitted',
    header: 'Submitted',
    accessorFn: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : ''),
    cell: ({ row }) => (
      <Typography variant="body2">
        {row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '—'}
      </Typography>
    ),
  },
  {
    id: 'from',
    header: 'From',
    accessorFn: (row) => `${row.fullName} ${row.email} ${row.username ?? ''}`,
    cell: ({ row }) => (
      <>
        <Typography fontWeight={600} variant="body2">
          {row.original.fullName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.original.email}
        </Typography>
        {row.original.username ? (
          <Typography variant="caption" color="text.secondary" display="block">
            @{row.original.username}
          </Typography>
        ) : null}
      </>
    ),
  },
  {
    id: 'topic',
    header: 'Topic',
    accessorKey: 'topic',
    cell: ({ row }) => (
      <Typography variant="body2" noWrap title={row.original.topic}>
        {row.original.topic}
      </Typography>
    ),
  },
  {
    id: 'company',
    header: 'Company',
    accessorFn: (row) => row.company ?? '',
    cell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {row.original.company ?? '—'}
      </Typography>
    ),
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        component={Link}
        href={`/contact-leads/${row.original.id}`}
        size="small"
        variant="outlined"
      >
        Open
      </Button>
    ),
  },
];
