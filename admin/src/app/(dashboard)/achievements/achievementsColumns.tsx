'use client';

import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdminAchievementItem } from '@/lib/achievements/achievementCatalogAdmin';
import {
  AchievementActiveBadge,
  AchievementCatalogIconBadge,
  AchievementCategoryBadge,
  AchievementModuleBadge,
  AchievementPointsBadge,
} from '@/components/achievements/achievementTableBadges';

export type AchievementRowActions = {
  onEdit: (row: AdminAchievementItem) => void;
  onDelete: (row: AdminAchievementItem) => void;
  deletingId: string | null;
};

export function achievementsColumns(
  actions: AchievementRowActions
): ColumnDef<AdminAchievementItem, unknown>[] {
  return [
    {
      id: 'title',
      header: 'Achievement',
      accessorKey: 'title',
      cell: ({ row }) => (
        <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap>
          <AchievementCatalogIconBadge active={row.original.active} />
          <Box minWidth={0}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {row.original.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace" noWrap>
              {row.original.key}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      id: 'module',
      header: 'Module',
      accessorKey: 'module',
      cell: ({ row }) => <AchievementModuleBadge module={row.original.module} />,
    },
    {
      id: 'category',
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }) => <AchievementCategoryBadge category={row.original.category} />,
    },
    {
      id: 'metric',
      header: 'Metric / target',
      cell: ({ row }) => (
        <Box>
          <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block">
            {row.original.metric}
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
            Target: {row.original.target}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'points',
      header: 'Points',
      accessorKey: 'points',
      cell: ({ row }) => <AchievementPointsBadge points={row.original.points} />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <AchievementActiveBadge active={row.original.active} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit">
            <IconButton
              size="small"
              aria-label={`Edit ${row.original.title}`}
              onClick={() => actions.onEdit(row.original)}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Hide">
            <IconButton
              size="small"
              color="error"
              aria-label={`Hide ${row.original.title}`}
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
