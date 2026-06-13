'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AuditLogRow } from '@/admin/api/management';

export const auditLogColumns: ColumnDef<AuditLogRow, unknown>[] = [
  {
    id: 'time',
    header: 'Time',
    accessorFn: (row) => (row.timestamp ? new Date(row.timestamp).toLocaleString() : ''),
    cell: ({ row }) =>
      row.original.timestamp ? new Date(row.original.timestamp).toLocaleString() : '—',
  },
  {
    id: 'action',
    header: 'Action',
    accessorKey: 'action',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
        {String(getValue() ?? '—')}
      </span>
    ),
  },
  {
    id: 'actor',
    header: 'Actor',
    accessorFn: (row) => row.actorId ?? '',
    cell: ({ row }) => (
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
        {row.original.actorId ?? '—'}
      </span>
    ),
  },
  {
    id: 'target',
    header: 'Target',
    accessorFn: (row) => (row.targetType ? `${row.targetType}:${row.targetId ?? ''}` : ''),
    cell: ({ row }) => {
      const t = row.original;
      return (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
          {t.targetType ? `${t.targetType}:${t.targetId ?? ''}` : '—'}
        </span>
      );
    },
  },
  {
    id: 'ip',
    header: 'IP',
    accessorFn: (row) => row.ip ?? '',
    cell: ({ row }) => row.original.ip ?? '—',
  },
];
