'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, FormControlLabel, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { useAdminStepUpRetry } from '@/lib/auth/useAdminStepUpRetry';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import type { AdminRoleRow } from '@/admin';
import {
  archiveRole,
  createRole,
  listRoles,
  restoreRole,
  simulateIamPermission,
  updateRole,
} from '@/admin';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import { rolesTableColumns } from './accessCrudColumns';
import { RolePermissionsPicker } from './RolePermissionsPicker';
import { AdminDialogInfo } from '@/components/ui/AdminDialogInfo';

export function RolesCrudSection({ token }: { token: string | null }) {
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [simulateRoleId, setSimulateRoleId] = useState('');
  const [simulateAction, setSimulateAction] = useState('user:list');
  const [simulateResult, setSimulateResult] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

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

  useAdminStepUpRetry(refresh);

  function openCreate() {
    setName('');
    setLevel('100');
    setDescription('');
    setPermissions([]);
    setCreateOpen(true);
    setError(null);
  }

  function openEdit(row: AdminRoleRow) {
    setEditRow(row);
    setName(row.name);
    setLevel(String(row.level));
    setDescription(row.description ?? '');
    setPermissions([...row.permissions]);
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
        permissions,
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
        permissions,
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

  async function runSimulate() {
    if (!simulateRoleId.trim() || !simulateAction.trim()) {
      setSimulateResult('Select a role and enter a permission action.');
      return;
    }
    setSimulating(true);
    setSimulateResult(null);
    try {
      const r = await simulateIamPermission(token, {
        roleId: simulateRoleId,
        action: simulateAction.trim(),
      });
      const zones = r.securityZones.length ? r.securityZones.join(', ') : 'none';
      setSimulateResult(
        r.allowed
          ? `Allowed — zones: ${zones}; capabilities: ${r.capabilityIds.length}`
          : `Denied (${r.code ?? 'unknown'}): ${r.reason ?? 'No reason'}`
      );
    } catch (e) {
      setSimulateResult(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setSimulating(false);
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

  const columns = useMemo(
    () =>
      rolesTableColumns({
        onEdit: openEdit,
        onArchive: setArchiveRow,
        onRestore: (row) => void doRestore(row),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Stack spacing={2}>
      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="Roles"
        right={
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={includeDeleted}
                  onChange={(_, v) => setIncludeDeleted(v)}
                  size="small"
                />
              }
              label="Archived"
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={openCreate}
            >
              Add role
            </Button>
          </>
        }
      />

      <AdminDataTable
        data={roles}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage="No roles yet. Create one to assign to dashboard operators."
        totalLabel="roles"
        pageSize={25}
        dense
      />

      <AdminDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create role"
        headerIcon={<BadgeRoundedIcon />}
        footerStart={
          <AdminDialogInfo title="Role permissions" tooltip="How permissions work">
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Assign permission keys from the catalog below. Click a badge to add it, or drag it
                into the permissions box. Use the × on a selected badge to remove it.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Keys follow resource:action (for example user:list). Only keys defined under Access
                → Permissions are valid for new roles.
              </Typography>
            </Stack>
          </AdminDialogInfo>
        }
        maxWidth="md"
        primaryButton={{ label: 'Create', onClick: () => void submitCreate(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setCreateOpen(false), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Level (0–1000)"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            type="number"
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <RolePermissionsPicker token={token} value={permissions} onChange={setPermissions} />
        </Stack>
      </AdminDialog>

      <AdminDialog
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="Edit role"
        headerIcon={<BadgeRoundedIcon />}
        footerStart={
          <AdminDialogInfo title="Role permissions" tooltip="How permissions work">
            <Typography variant="body2" color="text.secondary">
              Click or drag permission badges to add them. Remove selected keys with the × on each
              badge.
            </Typography>
          </AdminDialogInfo>
        }
        maxWidth="md"
        primaryButton={{ label: 'Save', onClick: () => void submitEdit(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setEditRow(null), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Level (0–1000)"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            type="number"
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <RolePermissionsPicker token={token} value={permissions} onChange={setPermissions} />
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

      <Paper
        elevation={0}
        className="border border-[var(--color-border)]"
        sx={{ borderColor: 'divider', borderRadius: 2, p: 2 }}
      >
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Permission simulator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Preview whether a role would be allowed to perform an action (uses the policy engine).
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }}>
          <TextField
            select
            SelectProps={{ native: true }}
            label="Role"
            value={simulateRoleId}
            onChange={(e) => setSimulateRoleId(e.target.value)}
            fullWidth
            size="small"
          >
            <option value="">Select role…</option>
            {roles
              .filter((r) => !r.deletedAt)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </TextField>
          <TextField
            label="Permission action"
            value={simulateAction}
            onChange={(e) => setSimulateAction(e.target.value)}
            fullWidth
            size="small"
            placeholder="user:list"
          />
          <Button
            variant="outlined"
            onClick={() => void runSimulate()}
            disabled={simulating || !simulateRoleId}
            sx={{ borderRadius: 2, flexShrink: 0 }}
          >
            {simulating ? 'Simulating…' : 'Simulate'}
          </Button>
        </Stack>
        {simulateResult ? (
          <AdminFeedbackMessage
            severity={
              simulateResult.startsWith('Allowed')
                ? 'success'
                : simulateResult.startsWith('Denied')
                  ? 'warning'
                  : 'info'
            }
            message={simulateResult}
            sx={{ mt: 2 }}
          />
        ) : null}
      </Paper>
    </Stack>
  );
}
