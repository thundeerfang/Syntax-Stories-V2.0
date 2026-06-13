'use client';

import Link from 'next/link';
import { Button, Chip, Typography } from '@mui/material';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import type { ColumnDef } from '@tanstack/react-table';
import type { FeedbackSubmissionListItem } from '@/lib/api';

export const feedbacksColumns: ColumnDef<FeedbackSubmissionListItem, unknown>[] = [
  {
    id: 'submitted',
    header: 'Submitted',
    accessorKey: 'createdAt',
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
    id: 'category',
    header: 'Category',
    accessorKey: 'categoryLabel',
    cell: ({ row }) => <Chip size="small" label={row.original.categoryLabel} variant="outlined" />,
  },
  {
    id: 'from',
    header: 'From',
    accessorFn: (row) => `${row.firstName} ${row.lastName} ${row.email}`,
    cell: ({ row }) => (
      <>
        <Typography fontWeight={600} variant="body2">
          {row.original.firstName} {row.original.lastName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.original.email}
        </Typography>
      </>
    ),
  },
  {
    id: 'subject',
    header: 'Subject',
    accessorKey: 'subject',
    cell: ({ row }) => (
      <Typography variant="body2" noWrap title={row.original.subject}>
        {row.original.subject}
      </Typography>
    ),
  },
  {
    id: 'file',
    header: 'File',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.hasAttachment ? (
        <AttachFileRoundedIcon fontSize="small" color="action" aria-label="Has attachment" />
      ) : (
        <Typography variant="caption" color="text.disabled">
          —
        </Typography>
      ),
  },
  {
    id: 'review',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        component={Link}
        href={`/feedbacks/${row.original.id}`}
        size="small"
        variant="outlined"
      >
        Review
      </Button>
    ),
  },
];
