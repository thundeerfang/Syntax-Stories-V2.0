'use client';

import { Box, IconButton, Stack, Switch, Tooltip, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminBillingPlanItem } from '@/lib/billing/billingPlanCatalogAdmin';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import { PlanCatalogBadge } from '@/components/subscriptions/PlanCatalogBadge';

export type SubscriptionPlanRowActions = {
  onEdit: (row: AdminBillingPlanItem) => void;
  onDelete: (row: AdminBillingPlanItem) => void;
  onToggleMostPopular: (row: AdminBillingPlanItem, next: boolean) => void;
  deletingId: string | null;
  togglingPopularId: string | null;
};

export function subscriptionPlansColumns(
  actions: SubscriptionPlanRowActions
): ColumnDef<AdminBillingPlanItem, unknown>[] {
  return [
    {
      id: 'name',
      header: 'Plan',
      accessorKey: 'name',
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {row.original.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
            {row.original.key}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={600}>
          {row.original.amountDisplay}{' '}
          <Typography component="span" variant="caption" color="text.secondary">
            {row.original.cadence}
          </Typography>
        </Typography>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
          {row.original.description}
        </Typography>
      ),
    },
    {
      id: 'features',
      header: 'Features',
      cell: ({ row }) => (
        <Box component="ul" sx={{ m: 0, pl: 2.25, maxWidth: 360 }}>
          {row.original.features.map((f) => (
            <Typography key={f} component="li" variant="caption" color="text.secondary">
              {f}
            </Typography>
          ))}
        </Box>
      ),
    },
    {
      id: 'mostPopular',
      header: 'Most popular',
      cell: ({ row }) => {
        const busy = actions.togglingPopularId === row.original.id;
        const checked = row.original.featured;
        return (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Switch
              size="small"
              checked={checked}
              disabled={busy}
              inputProps={{ 'aria-label': `Most popular for ${row.original.name}` }}
              onChange={(_, next) => actions.onToggleMostPopular(row.original, next)}
            />
            {checked ? <PlanCatalogBadge badge={row.original.badge} featured={row.original.featured} /> : null}
          </Stack>
        );
      },
    },
    {
      id: 'status',
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
              aria-label={`Edit ${row.original.name}`}
              onClick={() => actions.onEdit(row.original)}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              aria-label={`Delete ${row.original.name}`}
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
