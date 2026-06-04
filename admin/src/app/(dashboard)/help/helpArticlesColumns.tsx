'use client';

import Link from 'next/link';
import { Button, IconButton, Stack, Typography } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import type { ColumnDef } from '@tanstack/react-table';
import type { HelpListItem } from '@/lib/api';
import { HelpIconGlyph } from '@/lib/help/helpIconGlyphs';
import { HELP_ICON_LABELS } from '@/lib/help/helpIcons';

export type HelpArticleRowActions = {
  deletingId: string | null;
  onMoveToTrash: (id: string, title: string) => void;
};

export function helpArticlesColumns(
  actions: HelpArticleRowActions
): ColumnDef<HelpListItem, unknown>[] {
  return [
    {
      id: 'title',
      header: 'Article',
      accessorFn: (row) => row.title || row.slug,
      cell: ({ row }) => (
        <>
          <Link
            href={`/help/${row.original._id}/edit`}
            className="font-semibold text-[var(--color-primary)] no-underline hover:underline"
          >
            {row.original.title || row.original.slug}
          </Link>
          <Typography variant="caption" color="text.secondary" className="mt-0.5 block font-mono">
            {row.original.slug}
          </Typography>
        </>
      ),
    },
    {
      id: 'icon',
      header: 'Icon',
      accessorFn: (row) => row.icon ?? 'circle-help',
      cell: ({ row }) => {
        const key = row.original.icon ?? 'circle-help';
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <HelpIconGlyph name={key} />
            <Typography variant="body2" color="text.secondary">
              {HELP_ICON_LABELS[key as keyof typeof HELP_ICON_LABELS] ?? key}
            </Typography>
          </Stack>
        );
      },
    },
    {
      id: 'publicPath',
      header: 'Public URL',
      accessorFn: (row) => row.slug,
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" fontFamily="monospace">
          /help/{row.original.slug}
        </Typography>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.status,
      cell: ({ row }) => {
        const label =
          row.original.isPublished || row.original.status === 'published'
            ? 'Published'
            : row.original.status === 'scheduled'
              ? 'Scheduled'
              : row.original.status === 'archived'
                ? 'Archived'
                : 'Draft';
        return (
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        );
      },
    },
    {
      id: 'version',
      header: 'Versions',
      accessorFn: (row) => row.publishedVersion,
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" fontFamily="monospace">
          d{row.original.draftVersion} · p{row.original.publishedVersion}
        </Typography>
      ),
    },
    {
      id: 'updatedAt',
      header: 'Updated',
      accessorFn: (row) => row.updatedAt,
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">
          {row.original.updatedAt
            ? new Date(row.original.updatedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '—'}
        </Typography>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
          <Button
            component={Link}
            href={`/help/${row.original._id}/edit`}
            size="small"
            variant="outlined"
            startIcon={<EditRoundedIcon sx={{ fontSize: 16 }} />}
          >
            Edit
          </Button>
          <IconButton
            size="small"
            aria-label="Move to trash"
            disabled={actions.deletingId === row.original._id}
            onClick={() =>
              actions.onMoveToTrash(row.original._id, row.original.title || row.original.slug)
            }
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];
}
