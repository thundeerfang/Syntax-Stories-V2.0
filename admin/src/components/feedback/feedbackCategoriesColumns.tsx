'use client';

import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { ColumnDef } from '@tanstack/react-table';
import type { FeedbackCategoryItem } from '@/lib/api';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';

export type FeedbackCategoryRowActions = {
  onEdit: (row: FeedbackCategoryItem) => void;
  onDelete: (row: FeedbackCategoryItem) => void;
  deletingId: string | null;
};

export function feedbackCategoriesColumns(
  actions: FeedbackCategoryRowActions
): ColumnDef<FeedbackCategoryItem, unknown>[] {
  return [
    {
      id: 'label',
      header: 'Label',
      accessorKey: 'label',
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={600}>
          {row.original.label}
        </Typography>
      ),
    },
    {
      id: 'slug',
      header: 'Slug',
      accessorKey: 'slug',
      cell: ({ row }) => (
        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
          {row.original.slug}
        </Typography>
      ),
    },
    {
      id: 'sortOrder',
      header: 'Order',
      accessorKey: 'sortOrder',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {row.original.sortOrder}
        </Typography>
      ),
    },
    {
      id: 'active',
      header: 'Status',
      cell: ({ row }) => (
        <AdminStatusBadge
          label={row.original.active ? 'Active' : 'Hidden'}
          tone={row.original.active ? 'success' : 'neutral'}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit">
            <IconButton
              size="small"
              aria-label={`Edit ${row.original.label}`}
              onClick={() => actions.onEdit(row.original)}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              aria-label={`Delete ${row.original.label}`}
              disabled={actions.deletingId === row.original.id}
              onClick={() => actions.onDelete(row.original)}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];
}
