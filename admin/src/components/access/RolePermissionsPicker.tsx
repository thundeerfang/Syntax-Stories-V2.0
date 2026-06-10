'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { listAccessPermissions } from '@/admin';

/** Fallback keys when catalog API is empty (matches server adminPermissions). */
const FALLBACK_PERMISSION_KEYS = [
  'user:list',
  'user:read',
  'user:search',
  'user:update_profile',
  'user:lock',
  'user:unlock',
  'user:reset_email',
  'user:read_oauth',
  'user:read_security',
  'user:revoke_sessions',
  'user:impersonate',
  'billing:read_subscription',
  'billing:read_ledger',
  'billing:open_stripe_customer',
  'billing:sync_subscription',
  'billing:manage_plans',
  'blog:read_metrics',
  'blog:list',
  'blog:read',
  'admin_role:manage',
  'admin_assignment:manage',
  'audit:read',
  'feedback:read',
  'feedback:manage',
  'contact_lead:read',
  'legal:manage',
  'trash:manage',
  'achievement:list',
  'achievement:manage',
] as const;

const PERMISSIONS_PAGE_SIZE = 16;

export type RolePermissionsPickerProps = {
  token: string | null;
  value: string[];
  onChange: (keys: string[]) => void;
};

export function RolePermissionsPicker({ token, value, onChange }: RolePermissionsPickerProps) {
  const theme = useTheme();
  const [catalogKeys, setCatalogKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!token) {
      setCatalogKeys([...FALLBACK_PERMISSION_KEYS]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await listAccessPermissions(token, false);
      const keys = r.items.filter((p) => !p.deletedAt).map((p) => p.key);
      setCatalogKeys(keys.length > 0 ? keys.sort() : [...FALLBACK_PERMISSION_KEYS]);
    } catch {
      setCatalogKeys([...FALLBACK_PERMISSION_KEYS]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const available = useMemo(
    () => catalogKeys.filter((k) => !selectedSet.has(k)),
    [catalogKeys, selectedSet]
  );

  const pageCount = Math.max(1, Math.ceil(available.length / PERMISSIONS_PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount, available.length]);

  const pageItems = useMemo(() => {
    const start = page * PERMISSIONS_PAGE_SIZE;
    return available.slice(start, start + PERMISSIONS_PAGE_SIZE);
  }, [available, page]);

  function addKey(key: string) {
    if (selectedSet.has(key)) return;
    onChange([...value, key].sort());
  }

  function removeKey(key: string) {
    onChange(value.filter((k) => k !== key));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const key = e.dataTransfer.getData('text/permission-key');
    if (key) addKey(key);
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" fontWeight={600}>
        Permissions
      </Typography>

      <Box
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        sx={{
          minHeight: 88,
          p: 1.5,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver
            ? alpha(theme.palette.primary.main, 0.06)
            : alpha(theme.palette.background.default, 0.5),
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
      >
        {value.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Click or drag permission badges below to add them here.
          </Typography>
        ) : (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
            {value.map((key) => (
              <Chip
                key={key}
                label={key}
                size="small"
                onDelete={() => removeKey(key)}
                sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Available permissions
        </Typography>
        {!loading && available.length > 0 ? (
          <Typography variant="caption" color="text.secondary">
            {available.length.toLocaleString()} total
          </Typography>
        ) : null}
      </Stack>

      {loading ? (
        <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box
          sx={{
            minHeight: 120,
            p: 1,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.background.default, 0.4),
          }}
        >
          {available.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 0.5 }}>
              All catalog permissions are selected.
            </Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
              {pageItems.map((key) => (
                <Chip
                  key={key}
                  label={key}
                  size="small"
                  variant="outlined"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/permission-key', key);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addKey(key)}
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      borderColor: 'primary.main',
                    },
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>
      )}

      {!loading && available.length > PERMISSIONS_PAGE_SIZE ? (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
          <IconButton
            size="small"
            aria-label="Previous permissions page"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeftRoundedIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88, textAlign: 'center' }}>
            Page {page + 1} of {pageCount}
          </Typography>
          <IconButton
            size="small"
            aria-label="Next permissions page"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            <ChevronRightRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ) : null}
    </Stack>
  );
}
