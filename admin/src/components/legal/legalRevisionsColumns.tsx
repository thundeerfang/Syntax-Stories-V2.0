'use client';

import Link from 'next/link';
import { Button, IconButton, Stack } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { ColumnDef } from '@tanstack/react-table';
import type { LegalDocumentRow } from '@/lib/legal/buildLegalDocumentRows';
import type { LegalPolicyKind } from '@/lib/api/legalAdmin';
import { legalDraftPath, legalDraftViewPath, legalRevisionViewPath } from '@/lib/legal/legalPaths';
import {
  LegalPhaseBadge,
  LegalRevisionStatusBadge,
  LegalVersionBadge,
} from './LegalVersionBadge';

export type LegalRevisionRowActions = {
  kind: LegalPolicyKind;
  busyId: string | null;
  onDiscardDraft: () => void;
  onDeleteRevision: (revisionId: string) => void;
};

export function legalRevisionsColumns(
  actions: LegalRevisionRowActions
): ColumnDef<LegalDocumentRow, unknown>[] {
  const { kind } = actions;

  return [
    {
      id: 'title',
      header: 'Document',
      accessorFn: (row) => row.title,
      cell: ({ row }) => {
        const isDraft = row.original.rowType === 'draft';
        const href = isDraft
          ? legalDraftViewPath(kind)
          : legalRevisionViewPath(kind, row.original.id);
        return (
          <Link
            href={href}
            className="font-semibold text-[var(--color-primary)] no-underline hover:underline"
          >
            {row.original.title || 'Untitled'}
          </Link>
        );
      },
    },
    {
      id: 'version',
      header: 'Version',
      accessorKey: 'version',
      cell: ({ row }) => <LegalVersionBadge version={row.original.version} />,
    },
    {
      id: 'phase',
      header: 'Phase',
      accessorKey: 'phase',
      cell: ({ row }) => <LegalPhaseBadge phase={row.original.phase} />,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <LegalRevisionStatusBadge status={row.original.status} phase={row.original.phase} />
      ),
    },
    {
      id: 'publishedAt',
      header: 'Published',
      accessorFn: (row) => row.publishedAt ?? row.updatedAt ?? '',
      cell: ({ row }) => {
        const raw = row.original.publishedAt ?? row.original.updatedAt;
        return (
          <span className="text-sm text-[var(--mui-palette-text-secondary)]">
            {raw ? new Date(raw).toLocaleString() : '—'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const isDraft = row.original.rowType === 'draft';
        const revisionId = row.original.revisionId ?? row.original.id;
        const viewHref = isDraft
          ? legalDraftViewPath(kind)
          : legalRevisionViewPath(kind, revisionId);
        const editHref = isDraft ? legalDraftPath(kind) : legalDraftPath(kind, { startDraft: true });
        const canDeleteRevision =
          !isDraft && row.original.phase === 'past' && row.original.status === 'superseded';

        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
            <Button
              component={Link}
              href={viewHref}
              size="small"
              startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
            >
              View
            </Button>
            <Button
              component={Link}
              href={editHref}
              size="small"
              variant="outlined"
              startIcon={<EditRoundedIcon sx={{ fontSize: 16 }} />}
            >
              Edit
            </Button>
            {isDraft ? (
              <IconButton
                size="small"
                aria-label="Discard draft"
                disabled={actions.busyId === 'draft'}
                onClick={() => actions.onDiscardDraft()}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            ) : canDeleteRevision ? (
              <IconButton
                size="small"
                aria-label="Delete revision"
                disabled={actions.busyId === revisionId}
                onClick={() => actions.onDeleteRevision(revisionId)}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Stack>
        );
      },
    },
  ];
}
