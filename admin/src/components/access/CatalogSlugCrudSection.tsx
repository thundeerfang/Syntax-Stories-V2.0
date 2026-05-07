'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import type { CatalogSlugRow } from '@/admin';
import {
  archiveAccessAction,
  archiveAccessResource,
  archiveAccessScopeType,
  createAccessAction,
  createAccessResource,
  createAccessScopeType,
  listAccessActions,
  listAccessResources,
  listAccessScopeTypes,
  restoreAccessAction,
  restoreAccessResource,
  restoreAccessScopeType,
  updateAccessAction,
  updateAccessResource,
  updateAccessScopeType,
} from '@/admin';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';

export type CatalogSlugVariant = 'resources' | 'actions' | 'scopes';

const SLUG_HINT = 'Lowercase letters, numbers, underscores; must start with a letter.';

const listFn = {
  resources: listAccessResources,
  actions: listAccessActions,
  scopes: listAccessScopeTypes,
} as const;

const createFn = {
  resources: createAccessResource,
  actions: createAccessAction,
  scopes: createAccessScopeType,
} as const;

const updateFn = {
  resources: updateAccessResource,
  actions: updateAccessAction,
  scopes: updateAccessScopeType,
} as const;

const archiveFn = {
  resources: archiveAccessResource,
  actions: archiveAccessAction,
  scopes: archiveAccessScopeType,
} as const;

const restoreFn = {
  resources: restoreAccessResource,
  actions: restoreAccessAction,
  scopes: restoreAccessScopeType,
} as const;

const labels: Record<CatalogSlugVariant, { title: string; add: string; singular: string }> = {
  resources: { title: 'Resources', add: 'Add resource', singular: 'resource' },
  actions: { title: 'Actions', add: 'Add action', singular: 'action' },
  scopes: { title: 'Scope types', add: 'Add scope type', singular: 'scope type' },
};

export function CatalogSlugCrudSection({ token, variant }: { token: string; variant: CatalogSlugVariant }) {
  const [items, setItems] = useState<CatalogSlugRow[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<CatalogSlugRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<CatalogSlugRow | null>(null);
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [saving, setSaving] = useState(false);

  const L = labels[variant];

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listFn[variant](token, includeDeleted);
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, variant, includeDeleted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setSlug('');
    setDisplayName('');
    setDescription('');
    setSortOrder('0');
    setCreateOpen(true);
    setError(null);
  }

  function openEdit(row: CatalogSlugRow) {
    setEditRow(row);
    setDisplayName(row.displayName);
    setDescription(row.description ?? '');
    setSortOrder(String(row.sortOrder ?? 0));
    setError(null);
  }

  async function submitCreate() {
    setSaving(true);
    setError(null);
    try {
      await createFn[variant](token, {
        slug: slug.trim().toLowerCase(),
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      });
      setCreateOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit() {
    if (!editRow) return;
    setSaving(true);
    setError(null);
    try {
      await updateFn[variant](token, editRow.id, {
        displayName: displayName.trim(),
        description: description.trim() || null,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      });
      setEditRow(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    if (!archiveRow) return;
    setSaving(true);
    setError(null);
    try {
      await archiveFn[variant](token, archiveRow.id);
      setArchiveRow(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed');
    } finally {
      setSaving(false);
    }
  }

  async function doRestore(row: CatalogSlugRow) {
    setError(null);
    try {
      await restoreFn[variant](token, row.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <FormControlLabel
          control={
            <Switch checked={includeDeleted} onChange={(_, v) => setIncludeDeleted(v)} size="small" />
          }
          label="Show archived"
        />
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ borderRadius: 2 }}>
          {L.add}
        </Button>
      </Stack>

      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}

      <TableContainer component={Paper} elevation={0} className="border border-[var(--color-border)]" sx={{ borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Slug</TableCell>
              <TableCell>Display name</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Description</TableCell>
              <TableCell width={72}>Order</TableCell>
              <TableCell width={120} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading…</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    No rows yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id} hover sx={{ opacity: row.deletedAt ? 0.65 : 1 }}>
                  <TableCell>
                    <Typography fontWeight={600} fontFamily="monospace" variant="body2">
                      {row.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.displayName}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" color="text.secondary" noWrap title={row.description ?? ''}>
                      {row.description ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.sortOrder}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0} justifyContent="flex-end">
                      {!row.deletedAt ? (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(row)} aria-label="Edit">
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Archive (soft delete)">
                            <IconButton size="small" onClick={() => setArchiveRow(row)} aria-label="Archive">
                              <ArchiveOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="Restore">
                          <IconButton size="small" onClick={() => void doRestore(row)} aria-label="Restore">
                            <UnarchiveOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AdminDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Create ${L.singular}`}
        maxWidth="sm"
        primaryButton={{ label: 'Create', onClick: () => void submitCreate(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setCreateOpen(false), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required fullWidth helperText={SLUG_HINT} />
          <TextField label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
          <TextField label="Sort order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" fullWidth />
        </Stack>
      </AdminDialog>

      <AdminDialog
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title={`Edit ${L.singular}`}
        maxWidth="sm"
        primaryButton={{ label: 'Save', onClick: () => void submitEdit(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setEditRow(null), disabled: saving }}
      >
        {editRow ? (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Slug <Box component="span" fontFamily="monospace" fontWeight={600}>{editRow.slug}</Box> cannot be changed.
            </Typography>
            <TextField label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required fullWidth />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
            <TextField label="Sort order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" fullWidth />
          </Stack>
        ) : null}
      </AdminDialog>

      <ConfirmArchiveDialog
        open={Boolean(archiveRow)}
        title={`Archive ${L.singular}?`}
        description={`Archiving hides this ${L.singular} from active pickers. You can restore it later from this list with “Show archived”.`}
        onCancel={() => setArchiveRow(null)}
        onConfirm={() => void confirmArchive()}
        loading={saving}
      />
    </Stack>
  );
}
