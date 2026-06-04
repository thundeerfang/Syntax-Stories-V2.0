'use client';

import { Chip, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminOperatorRow } from '@/admin';

const kindLabel: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super admin',
};

export function adminTeamColumns(
  busyId: string | null,
  onToggleActive: (row: AdminOperatorRow, next: boolean) => void
): ColumnDef<AdminOperatorRow, unknown>[] {
  return [
    {
      id: 'operator',
      header: 'Operator',
      accessorFn: (row) => `${row.displayName} ${row.email}`,
      cell: ({ row }) => (
        <>
          <Typography fontWeight={600} variant="body2">
            {row.original.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            User ID {row.original.userId}
          </Typography>
        </>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'kind',
      cell: ({ row }) => (
        <Chip
          size="small"
          label={kindLabel[row.original.kind] ?? row.original.kind}
          variant="outlined"
        />
      ),
    },
    {
      id: 'role',
      header: 'Role',
      accessorFn: (row) => row.roleName ?? '',
      cell: ({ row }) => row.original.roleName ?? '—',
    },
    {
      id: 'active',
      header: 'Active',
      enableSorting: false,
      cell: ({ row }) => (
        <Stack direction="row" justifyContent="flex-end">
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={row.original.isActive}
                disabled={busyId === row.original.id}
                onChange={(_, v) => onToggleActive(row.original, v)}
              />
            }
            label=""
            sx={{ mr: 0 }}
          />
        </Stack>
      ),
    },
  ];
}
