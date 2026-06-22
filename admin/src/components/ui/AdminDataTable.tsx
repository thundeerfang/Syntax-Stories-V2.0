'use client';

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Box,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

export type AdminDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  loading?: boolean;
  emptyMessage?: string;
  /** Renders a filter field above the table (not inside the table chrome) */
  enableGlobalFilter?: boolean;
  globalFilterPlaceholder?: string;
  enableSorting?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  getRowId?: (row: TData) => string;
  dense?: boolean;
  maxHeight?: number | string;
  /** Override total label, e.g. "accounts" */
  totalLabel?: string;
  /** Override footer summary text (replaces default "N total …" label). */
  totalTextOverride?: string;
  /** When false, hides the footer count (e.g. "3 total plans"). */
  showTotal?: boolean;
};

export function AdminDataTable<TData>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No rows to display.',
  enableGlobalFilter = false,
  globalFilterPlaceholder = 'Filter rows…',
  enableSorting = true,
  enablePagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  getRowId,
  dense = false,
  maxHeight,
  totalLabel = 'records',
  totalTextOverride,
  showTotal = true,
}: AdminDataTableProps<TData>) {
  'use no memo';

  const theme = useTheme();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally returns stateful helpers for table rendering.
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: enableGlobalFilter ? getFilteredRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    globalFilterFn: 'includesString',
    getRowId,
    initialState: {
      pagination: { pageSize },
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalCount = enableGlobalFilter ? filteredCount : data.length;
  const cellPy = dense ? 1 : 1.5;
  const headPy = dense ? 1 : 1.25;
  const showPaginationControls = enablePagination && totalCount > 0;

  const totalText = loading
    ? 'Loading…'
    : (totalTextOverride ?? `${totalCount} total ${totalLabel}`);
  const showFooter = showTotal || showPaginationControls;

  return (
    <Stack spacing={enableGlobalFilter ? 1.5 : 0}>
      {enableGlobalFilter ? (
        <TextField
          label={globalFilterPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          sx={{ maxWidth: { xs: '100%', sm: 320 } }}
        />
      ) : null}

      <Box
        className="admin-data-table"
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ overflow: 'auto', maxHeight }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              borderRadius: 0,
              fontSize: dense ? '0.8125rem' : '0.875rem',
            }}
          >
            <Box
              component="thead"
              sx={{ bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 1 }}
            >
              {table.getHeaderGroups().map((hg) => (
                <Box component="tr" key={hg.id}>
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = enableSorting && header.column.getCanSort();
                    return (
                      <Box
                        component="th"
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        sx={{
                          textAlign: 'left',
                          fontWeight: 700,
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          px: 2,
                          py: headPy,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                          cursor: canSort ? 'pointer' : 'default',
                          userSelect: 'none',
                          borderRadius: 0,
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort ? (
                            sorted === 'asc' ? (
                              <ArrowUpwardRoundedIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                            ) : sorted === 'desc' ? (
                              <ArrowDownwardRoundedIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                            ) : (
                              <UnfoldMoreRoundedIcon sx={{ fontSize: 16, opacity: 0.35 }} />
                            )
                          ) : null}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
            <Box component="tbody">
              {loading && data.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={columns.length} sx={{ py: 6, textAlign: 'center' }}>
                    <CircularProgress size={28} />
                  </Box>
                </Box>
              ) : table.getRowModel().rows.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={columns.length} sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {emptyMessage}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <Box
                    component="tr"
                    key={row.id}
                    sx={{
                      opacity: (row.original as { deletedAt?: string | null }).deletedAt ? 0.65 : 1,
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                      '&:last-of-type td': { borderBottom: 'none' },
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Box
                        component="td"
                        key={cell.id}
                        sx={{
                          px: 2,
                          py: cellPy,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          verticalAlign: 'middle',
                          borderRadius: 0,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Box>
                    ))}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>

        {showFooter ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: showPaginationControls ? '1fr auto 1fr' : '1fr',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.25,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.04 : 0.03),
          }}
        >
          {showPaginationControls ? (
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ justifySelf: 'start' }}>
                <Typography variant="caption" color="text.secondary">
                  Rows per page
                </Typography>
                <Select
                  size="small"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  sx={{ minWidth: 72, borderRadius: 0 }}
                >
                  {pageSizeOptions.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
                sx={{ textAlign: 'center', whiteSpace: 'nowrap', justifySelf: 'center' }}
              >
                {totalText}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ justifySelf: 'end' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeftRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <ChevronRightRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </>
          ) : (
            <Typography
              variant="body2"
              fontWeight={600}
              color="text.secondary"
              sx={{ textAlign: 'center', gridColumn: '1 / -1' }}
            >
              {totalText}
            </Typography>
          )}
        </Box>
        ) : null}
      </Box>
    </Stack>
  );
}
