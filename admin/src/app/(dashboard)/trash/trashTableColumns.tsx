'use client';

import { Button, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';

export type TrashTableRow = {
  key: string;
  primary: string;
  secondary: string;
  meta: string;
  onRestore: () => void;
  disabled: boolean;
};

export const trashTableColumns: ColumnDef<TrashTableRow, unknown>[] = [
  {
    id: 'item',
    header: 'Item',
    accessorFn: (row) => `${row.primary} ${row.secondary}`,
    cell: ({ row }) => (
      <>
        <Typography variant="body2" fontWeight={600}>
          {row.original.primary}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {row.original.secondary}
        </Typography>
        <Typography variant="caption" color="text.secondary" className="sm:hidden">
          {row.original.meta}
        </Typography>
      </>
    ),
  },
  {
    id: 'deleted',
    header: 'Deleted',
    accessorKey: 'meta',
  },
  {
    id: 'action',
    header: 'Action',
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        size="small"
        variant="outlined"
        disabled={row.original.disabled}
        onClick={row.original.onRestore}
      >
        Restore
      </Button>
    ),
  },
];
