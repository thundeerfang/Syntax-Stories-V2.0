'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { useAdminStepUpRetry } from '@/lib/auth/useAdminStepUpRetry';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
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
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import { permissionsTableColumns } from './accessCrudColumns';
import { AdminDialogInfo } from '@/components/ui/AdminDialogInfo';

export function PermissionsCrudSection({ token }: { token: string | null }) {
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

  useAdminStepUpRetry(refresh);

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

  const columns = useMemo(
    () =>
      permissionsTableColumns({
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
        title="Permissions"
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
              Add permission
            </Button>
          </>
        }
      />

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage="No permission rows."
        totalLabel="permissions"
        pageSize={25}
        dense
      />

      <AdminDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create permission"
        headerIcon={<KeyRoundedIcon />}
        footerStart={
          <AdminDialogInfo title="Permission keys" tooltip="How keys are built">
            <Typography variant="body2" color="text.secondary">
              The key is built from resource, action, and scope. For the default management scope,
              the key is resource:action (for example user:list). Non-management scope types append
              a third segment, such as user:read:team.
            </Typography>
          </AdminDialogInfo>
        }
        maxWidth="sm"
        primaryButton={{ label: 'Create', onClick: () => void submitCreate(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setCreateOpen(false), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <FormControl fullWidth required disabled={!resources.length}>
            <InputLabel id="perm-res">Resource</InputLabel>
            <Select
              labelId="perm-res"
              label="Resource"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
            >
              {resources.map((r) => (
                <MenuItem key={r.id} value={r.slug}>
                  {r.slug} — {r.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required disabled={!actions.length}>
            <InputLabel id="perm-act">Action</InputLabel>
            <Select
              labelId="perm-act"
              label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              {actions.map((r) => (
                <MenuItem key={r.id} value={r.slug}>
                  {r.slug} — {r.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required disabled={!scopes.length}>
            <InputLabel id="perm-scope">Scope type</InputLabel>
            <Select
              labelId="perm-scope"
              label="Scope type"
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value)}
            >
              {scopes.map((r) => (
                <MenuItem key={r.id} value={r.slug}>
                  {r.slug} — {r.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Sort order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            type="number"
            fullWidth
          />
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
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Sort order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              type="number"
              fullWidth
            />
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
