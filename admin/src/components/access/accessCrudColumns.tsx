'use client';

import { Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminRoleRow, CatalogPermissionRow, CatalogSlugRow } from '@/admin';

type RowActions<T> = {
  onEdit: (row: T) => void;
  onArchive: (row: T) => void;
  onRestore: (row: T) => void;
};

function actionsColumn<T extends { deletedAt?: string | null }>(
  handlers: RowActions<T>
): ColumnDef<T, unknown> {
  return {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => (
      <Stack direction="row" spacing={0} justifyContent="flex-end">
        {!row.original.deletedAt ? (
          <>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => handlers.onEdit(row.original)}
                aria-label="Edit"
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Archive">
              <IconButton
                size="small"
                onClick={() => handlers.onArchive(row.original)}
                aria-label="Archive"
              >
                <ArchiveOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Tooltip title="Restore">
            <IconButton
              size="small"
              onClick={() => handlers.onRestore(row.original)}
              aria-label="Restore"
            >
              <UnarchiveOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    ),
  };
}

export function rolesTableColumns(
  handlers: RowActions<AdminRoleRow>
): ColumnDef<AdminRoleRow, unknown>[] {
  return [
    {
      id: 'role',
      header: 'Role',
      accessorFn: (row) => `${row.name} ${row.description ?? ''}`,
      cell: ({ row }) => (
        <>
          <Typography fontWeight={600} variant="body2">
            {row.original.name}
          </Typography>
          {row.original.description ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {row.original.description}
            </Typography>
          ) : null}
        </>
      ),
    },
    { id: 'level', header: 'Level', accessorKey: 'level' },
    {
      id: 'permissions',
      header: 'Permissions',
      accessorFn: (row) => row.permissions.join(' '),
      enableSorting: false,
      cell: ({ row }) => (
        <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
          {row.original.permissions.slice(0, 6).map((p) => (
            <Chip key={p} label={p} size="small" variant="outlined" />
          ))}
          {row.original.permissions.length > 6 ? (
            <Chip label={`+${row.original.permissions.length - 6}`} size="small" />
          ) : null}
        </Stack>
      ),
    },
    actionsColumn(handlers),
  ];
}

export function catalogSlugTableColumns(
  handlers: RowActions<CatalogSlugRow>
): ColumnDef<CatalogSlugRow, unknown>[] {
  return [
    {
      id: 'slug',
      header: 'Slug',
      accessorKey: 'slug',
      cell: ({ row }) => (
        <Typography fontWeight={600} fontFamily="monospace" variant="body2">
          {row.original.slug}
        </Typography>
      ),
    },
    { id: 'displayName', header: 'Display name', accessorKey: 'displayName' },
    {
      id: 'description',
      header: 'Description',
      accessorFn: (row) => row.description ?? '',
      cell: ({ row }) => (
        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          title={row.original.description ?? ''}
        >
          {row.original.description ?? '—'}
        </Typography>
      ),
    },
    { id: 'sortOrder', header: 'Order', accessorKey: 'sortOrder' },
    actionsColumn(handlers),
  ];
}

export function permissionsTableColumns(
  handlers: RowActions<CatalogPermissionRow>
): ColumnDef<CatalogPermissionRow, unknown>[] {
  return [
    {
      id: 'key',
      header: 'Key',
      accessorKey: 'key',
      cell: ({ row }) => (
        <Typography fontWeight={600} fontFamily="monospace" variant="body2">
          {row.original.key}
        </Typography>
      ),
    },
    { id: 'resource', header: 'Resource', accessorKey: 'resource' },
    { id: 'action', header: 'Action', accessorKey: 'action' },
    { id: 'type', header: 'Scope', accessorKey: 'type' },
    actionsColumn(handlers),
  ];
}
