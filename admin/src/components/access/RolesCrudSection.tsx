'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Chip,
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
import type { AdminRoleRow } from '@/admin';
import {
  archiveRole,
  createRole,
  listRoles,
  restoreRole,
  updateRole,
} from '@/admin';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';

function parsePermissionLines(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function RolesCrudSection({ token }: { token: string }) {
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminRoleRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<AdminRoleRow | null>(null);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('100');
  const [description, setDescription] = useState('');
  const [permText, setPermText] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listRoles(token, includeDeleted);
      setRoles(r.roles);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [token, includeDeleted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setName('');
    setLevel('100');
    setDescription('');
    setPermText('');
    setCreateOpen(true);
    setError(null);
  }

  function openEdit(row: AdminRoleRow) {
    setEditRow(row);
    setName(row.name);
    setLevel(String(row.level));
    setDescription(row.description ?? '');
    setPermText(row.permissions.join('\n'));
    setError(null);
  }

  async function submitCreate() {
    setSaving(true);
    setError(null);
    try {
      const lv = Number.parseInt(level, 10);
      if (Number.isNaN(lv) || lv < 0 || lv > 1000) {
        setError('Level must be between 0 and 1000.');
        setSaving(false);
        return;
      }
      await createRole(token, {
        name: name.trim(),
        level: lv,
        permissions: parsePermissionLines(permText),
        description: description.trim() || undefined,
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
      const lv = Number.parseInt(level, 10);
      if (Number.isNaN(lv) || lv < 0 || lv > 1000) {
        setError('Level must be between 0 and 1000.');
        setSaving(false);
        return;
      }
      await updateRole(token, editRow.id, {
        name: name.trim(),
        level: lv,
        permissions: parsePermissionLines(permText),
        description: description.trim() || null,
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
      await archiveRole(token, archiveRow.id);
      setArchiveRow(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed');
    } finally {
      setSaving(false);
    }
  }

  async function doRestore(row: AdminRoleRow) {
    setError(null);
    try {
      await restoreRole(token, row.id);
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
          label="Show archived roles"
        />
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ borderRadius: 2 }}>
          Add role
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
              <TableCell>Role</TableCell>
              <TableCell width={72}>Level</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Permissions</TableCell>
              <TableCell width={120} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Loading…</TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    No roles yet. Create one to assign to dashboard operators.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              roles.map((row) => (
                <TableRow key={row.id} hover sx={{ opacity: row.deletedAt ? 0.65 : 1 }}>
                  <TableCell>
                    <Typography fontWeight={600}>{row.name}</Typography>
                    {row.description ? (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {row.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.level}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
                      {row.permissions.slice(0, 6).map((p) => (
                        <Chip key={p} label={p} size="small" variant="outlined" />
                      ))}
                      {row.permissions.length > 6 ? (
                        <Chip label={`+${row.permissions.length - 6}`} size="small" />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0} justifyContent="flex-end">
                      {!row.deletedAt ? (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(row)} aria-label="Edit">
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Archive role">
                            <IconButton size="small" onClick={() => setArchiveRow(row)} aria-label="Archive">
                              <ArchiveOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="Restore role">
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
        title="Create role"
        maxWidth="sm"
        primaryButton={{ label: 'Create', onClick: () => void submitCreate(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setCreateOpen(false), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField label="Level (0–1000)" value={level} onChange={(e) => setLevel(e.target.value)} type="number" fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
          <TextField
            label="Permission keys"
            value={permText}
            onChange={(e) => setPermText(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            placeholder={'One per line or comma-separated, e.g.\nuser:list\nadmin_role:manage'}
            helperText="Keys must exist in the permission catalog (Access → Permissions)."
          />
        </Stack>
      </AdminDialog>

      <AdminDialog
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="Edit role"
        maxWidth="sm"
        primaryButton={{ label: 'Save', onClick: () => void submitEdit(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setEditRow(null), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField label="Level (0–1000)" value={level} onChange={(e) => setLevel(e.target.value)} type="number" fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
          <TextField
            label="Permission keys"
            value={permText}
            onChange={(e) => setPermText(e.target.value)}
            fullWidth
            multiline
            minRows={6}
          />
        </Stack>
      </AdminDialog>

      <ConfirmArchiveDialog
        open={Boolean(archiveRow)}
        title="Archive role?"
        description="You cannot archive a role that is still assigned to an active admin user. Archived roles can be restored from this list."
        onCancel={() => setArchiveRow(null)}
        onConfirm={() => void confirmArchive()}
        loading={saving}
      />
    </Stack>
  );
}
