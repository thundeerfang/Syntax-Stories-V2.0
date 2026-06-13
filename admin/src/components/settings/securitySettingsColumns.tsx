'use client';

import { Button, Stack, Typography } from '@mui/material';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminSessionRow, TemporalGrantRow, TrustedDeviceRow } from '@/admin/api/management';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';

function formatWhen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export type ElevationRowActions = {
  onRevoke: (id: string) => void;
};

export function elevationColumns(
  actions: ElevationRowActions
): ColumnDef<TemporalGrantRow, unknown>[] {
  return [
    {
      id: 'permissions',
      header: 'Permissions',
      accessorFn: (row) => row.permissions.join(', '),
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <VpnKeyRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
            {row.original.permissions.join(', ') || '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'expires',
      header: 'Expires',
      accessorKey: 'expiresAt',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <ScheduleRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatWhen(row.original.expiresAt)}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) =>
        !row.original.revokedAt ? (
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<BlockRoundedIcon />}
            onClick={() => actions.onRevoke(row.original.id)}
          >
            Revoke
          </Button>
        ) : (
          <AdminStatusBadge label="Revoked" tone="neutral" />
        ),
    },
  ];
}

export type DeviceRowActions = {
  onRevoke: (id: string) => void;
};

export function trustedDeviceColumns(
  actions: DeviceRowActions
): ColumnDef<TrustedDeviceRow, unknown>[] {
  return [
    {
      id: 'device',
      header: 'Device',
      accessorKey: 'deviceName',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <ComputerRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>
            {row.original.deviceName || 'Unknown device'}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'lastSeen',
      header: 'Last seen',
      accessorKey: 'lastSeenAt',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <ScheduleRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatWhen(row.original.lastSeenAt)}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<LogoutRoundedIcon />}
          onClick={() => actions.onRevoke(row.original.id)}
        >
          Revoke
        </Button>
      ),
    },
  ];
}

export type SessionRowActions = {
  onRevoke: (id: string) => void;
};

export function adminSessionColumns(
  actions: SessionRowActions
): ColumnDef<AdminSessionRow, unknown>[] {
  return [
    {
      id: 'device',
      header: 'Device',
      accessorKey: 'deviceName',
      cell: ({ row }) => (
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <ComputerRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={600}>
              {row.original.deviceName}
            </Typography>
          </Stack>
          {row.original.isCurrent ? (
            <AdminStatusBadge
              label="Current"
              tone="primary"
              emphasis
              icon={<DevicesRoundedIcon fontSize="inherit" />}
            />
          ) : null}
        </Stack>
      ),
    },
    {
      id: 'ip',
      header: 'IP',
      accessorFn: (row) => row.ip ?? '—',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <LanguageRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
            {row.original.ip ?? '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'lastActive',
      header: 'Last active',
      accessorKey: 'lastActiveAt',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <ScheduleRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatWhen(row.original.lastActiveAt)}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) =>
        !row.original.isCurrent ? (
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<LogoutRoundedIcon />}
            onClick={() => actions.onRevoke(row.original.id)}
          >
            Revoke
          </Button>
        ) : (
          <Typography variant="caption" color="text.disabled">
            This device
          </Typography>
        ),
    },
  ];
}
