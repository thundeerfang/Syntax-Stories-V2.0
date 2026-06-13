'use client';

import { Link as MuiLink, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminUserLedgerItem } from '@/admin/api/management';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';

function formatAmount(minor: number, currency: string): string {
  const major = minor / 100;
  const code = currency.toUpperCase();
  if (code === 'INR') return `₹${major.toLocaleString()}`;
  return `${major.toLocaleString()} ${code}`;
}

export const userLedgerColumns: ColumnDef<AdminUserLedgerItem, unknown>[] = [
  {
    id: 'paidAt',
    header: 'Date',
    cell: ({ row }) => (
      <Typography variant="body2">
        {row.original.paidAt ? formatUserDetailDate(row.original.paidAt) : '—'}
      </Typography>
    ),
  },
  {
    id: 'description',
    header: 'Description',
    accessorKey: 'description',
    cell: ({ row }) => (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
        {row.original.description || row.original.stripeInvoiceId}
      </Typography>
    ),
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <Typography variant="body2" fontWeight={700}>
        {formatAmount(row.original.amountPaid, row.original.currency)}
      </Typography>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <AdminStatusBadge
        label={row.original.status}
        tone={row.original.status === 'paid' ? 'success' : 'neutral'}
      />
    ),
  },
  {
    id: 'invoice',
    header: 'Invoice',
    cell: ({ row }) =>
      row.original.hostedInvoiceUrl ? (
        <MuiLink href={row.original.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" variant="body2">
          View
        </MuiLink>
      ) : (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      ),
  },
];
