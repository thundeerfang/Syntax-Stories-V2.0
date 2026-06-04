'use client';

import Link from 'next/link';
import { Avatar, Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminUserListItem } from '@/admin';
import { resolveProfileMediaUrl } from '@/lib/users/resolveProfileMediaUrl';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';
import { userProfilePath } from '@/lib/users/userProfilePath';

export const platformAccountsColumns: ColumnDef<AdminUserListItem, unknown>[] = [
  {
    id: 'account',
    header: 'Account',
    accessorFn: (row) => `${row.fullName} ${row.username}`,
    cell: ({ row }) => {
      const u = row.original;
      return (
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            src={resolveProfileMediaUrl(u.profileImg, u.username)}
            alt=""
            sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem' }}
          >
            {u.fullName.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography fontWeight={600} variant="body2">
              {u.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{u.username}
            </Typography>
          </Box>
        </Stack>
      );
    },
  },
  {
    id: 'type',
    header: 'Type',
    accessorKey: 'accountType',
    cell: ({ row }) => (
      <Chip
        size="small"
        label={(row.original.accountType ?? (row.original.staffRole ? 'staff' : 'platform')) === 'staff' ? 'Staff' : 'Platform'}
        color={(row.original.accountType ?? (row.original.staffRole ? 'staff' : 'platform')) === 'staff' ? 'primary' : 'default'}
        variant="outlined"
      />
    ),
    meta: { hideXs: true },
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
    meta: { hideSm: true },
  },
  {
    id: 'job',
    header: 'Job',
    accessorFn: (row) => row.job ?? '',
    cell: ({ row }) => row.original.job ?? '—',
    meta: { hideMd: true },
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (row) => `${row.isActive} ${row.emailVerified}`,
    enableSorting: false,
    cell: ({ row }) => (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={row.original.isActive ? 'Active' : 'Locked'}
          color={row.original.isActive ? 'success' : 'default'}
          variant="outlined"
        />
        {row.original.twoFactorEnabled ? (
          <Chip size="small" label="2FA" color="info" variant="outlined" />
        ) : null}
      </Stack>
    ),
  },
  {
    id: 'joined',
    header: 'Joined',
    accessorFn: (row) => row.createdAt,
    cell: ({ row }) => (
      <Typography variant="caption" color="text.secondary">
        {formatUserDetailDate(row.original.createdAt)}
      </Typography>
    ),
    meta: { hideMd: true },
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        component={Link}
        href={userProfilePath(row.original.ref)}
        size="small"
        variant="outlined"
      >
        Open
      </Button>
    ),
  },
];
