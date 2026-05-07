'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import type { CatalogPermissionRow, CatalogSlugRow } from '@/admin';
import {
  archiveAccessPermission,
  createAccessPermission,
  listAccessActions,
  listAccessPermissions,
  listAccessResources,
  listAccessScopeTypes,
  restoreAccessPermission,
  updateAccessPermission,
} from '@/admin';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';

export function PermissionsCrudSection({ token }: { token: string }) {
  const [items, setItems] = useState<CatalogPermissionRow[]>([]);
  const [resources, setResources] = useState<CatalogSlugRow[]>([]);
  const [actions, setActions] = useState<CatalogSlugRow[]>([]);
  const [scopes, setScopes] = useState<CatalogSlugRow[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<CatalogPermissionRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<CatalogPermissionRow | null>(null);
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [scopeType, setScopeType] = useState('management');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, a, s, perm] = await Promise.all([
        listAccessResources(token, false),
        listAccessActions(token, false),
        listAccessScopeTypes(token, false),
        listAccessPermissions(token, includeDeleted),
      ]);
      setResources(r.items);
      setActions(a.items);
      setScopes(s.items);
      setItems(perm.items);
      setResource((prev) => prev || r.items[0]?.slug || '');
      setAction((prev) => prev || a.items[0]?.slug || '');
      setScopeType((prev) => {
        if (prev) return prev;
        const m = s.items.find((x) => x.slug === 'management');
        return m?.slug ?? s.items[0]?.slug ?? 'management';
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, includeDeleted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setDescription('');
    setSortOrder('0');
    setCreateOpen(true);
    setError(null);
  }

  function openEdit(row: CatalogPermissionRow) {
    setEditRow(row);
    setDescription(row.description ?? '');
    setSortOrder(String(row.sortOrder ?? 0));
    setError(null);
  }

  async function submitCreate() {
    setSaving(true);
    setError(null);
    try {
      await createAccessPermission(token, {
        resource,
        action,
        type: scopeType || 'management',
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
      await updateAccessPermission(token, editRow.id, {
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
      await archiveAccessPermission(token, archiveRow.id);
      setArchiveRow(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed');
    } finally {
      setSaving(false);
    }
  }

  async function doRestore(row: CatalogPermissionRow) {
    setError(null);
    try {
      await restoreAccessPermission(token, row.id);
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
          Add permission
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
              <TableCell>Key</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Resource</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Action</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Scope</TableCell>
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
                    No permission rows.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id} hover sx={{ opacity: row.deletedAt ? 0.65 : 1 }}>
                  <TableCell>
                    <Typography fontWeight={600} fontFamily="monospace" variant="body2">
                      {row.key}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.resource}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.action}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{row.type}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0} justifyContent="flex-end">
                      {!row.deletedAt ? (
                        <>
                          <Tooltip title="Edit details">
                            <IconButton size="small" onClick={() => openEdit(row)} aria-label="Edit">
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Archive">
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
        title="Create permission"
        maxWidth="sm"
        primaryButton={{ label: 'Create', onClick: () => void submitCreate(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setCreateOpen(false), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            The key is built from resource, action, and scope (non-management scopes append a third segment).
          </Typography>
          <FormControl fullWidth required disabled={!resources.length}>
            <InputLabel id="perm-res">Resource</InputLabel>
            <Select labelId="perm-res" label="Resource" value={resource} onChange={(e) => setResource(e.target.value)}>
              {resources.map((r) => (
                <MenuItem key={r.id} value={r.slug}>
                  {r.slug} — {r.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required disabled={!actions.length}>
            <InputLabel id="perm-act">Action</InputLabel>
            <Select labelId="perm-act" label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
              {actions.map((r) => (
                <MenuItem key={r.id} value={r.slug}>
                  {r.slug} — {r.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required disabled={!scopes.length}>
            <InputLabel id="perm-scope">Scope type</InputLabel>
            <Select labelId="perm-scope" label="Scope type" value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
              {scopes.map((r) => (
                <MenuItem key={r.id} value={r.slug}>
                  {r.slug} — {r.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
          <TextField label="Sort order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" fullWidth />
        </Stack>
      </AdminDialog>

      <AdminDialog
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="Edit permission"
        maxWidth="sm"
        primaryButton={{ label: 'Save', onClick: () => void submitEdit(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setEditRow(null), disabled: saving }}
      >
        {editRow ? (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Key{' '}
              <Box component="span" fontFamily="monospace" fontWeight={600}>
                {editRow.key}
              </Box>{' '}
              is fixed. To change resource or action, archive this row and create a new permission.
            </Typography>
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
            <TextField label="Sort order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" fullWidth />
          </Stack>
        ) : null}
      </AdminDialog>

      <ConfirmArchiveDialog
        open={Boolean(archiveRow)}
        title="Archive permission?"
        description="Archived keys no longer extend the effective permission catalog until restored."
        onCancel={() => setArchiveRow(null)}
        onConfirm={() => void confirmArchive()}
        loading={saving}
      />
    </Stack>
  );
}
