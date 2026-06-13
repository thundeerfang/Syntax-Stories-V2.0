'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { previewSlugFromDisplayName } from '@/lib/slug/slugifyDisplayName';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { useAdminStepUpRetry } from '@/lib/auth/useAdminStepUpRetry';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
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
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import { catalogSlugTableColumns } from './accessCrudColumns';

export type CatalogSlugVariant = 'resources' | 'actions' | 'scopes';

function previewAccessCatalogSlug(displayName: string): string {
  return previewSlugFromDisplayName(displayName, 80).replace(/-/g, '_');
}

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

export function CatalogSlugCrudSection({
  token,
  variant,
}: {
  token: string | null;
  variant: CatalogSlugVariant;
}) {
  const [items, setItems] = useState<CatalogSlugRow[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<CatalogSlugRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<CatalogSlugRow | null>(null);
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

  useAdminStepUpRetry(refresh);

  function openCreate() {
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

  const totalLabel =
    variant === 'resources' ? 'resources' : variant === 'actions' ? 'actions' : 'scope types';

  const createSlugPreview = useMemo(
    () => (createOpen && displayName.trim() ? previewAccessCatalogSlug(displayName) : ''),
    [createOpen, displayName]
  );

  const columns = useMemo(
    () =>
      catalogSlugTableColumns({
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
        title={L.title}
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
              {L.add}
            </Button>
          </>
        }
      />

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage="No rows yet."
        totalLabel={totalLabel}
        pageSize={25}
        dense
      />

      <AdminDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Create ${L.singular}`}
        maxWidth="sm"
        primaryButton={{ label: 'Create', onClick: () => void submitCreate(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setCreateOpen(false), disabled: saving }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {createSlugPreview ? (
            <Typography variant="body2" color="text.secondary">
              Slug will be{' '}
              <Box component="span" fontFamily="monospace" fontWeight={600}>
                {createSlugPreview}
              </Box>{' '}
              (unique suffix added if needed)
            </Typography>
          ) : null}
          <TextField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
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
        title={`Edit ${L.singular}`}
        maxWidth="sm"
        primaryButton={{ label: 'Save', onClick: () => void submitEdit(), disabled: saving }}
        secondaryButton={{ label: 'Cancel', onClick: () => setEditRow(null), disabled: saving }}
      >
        {editRow ? (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Slug{' '}
              <Box component="span" fontFamily="monospace" fontWeight={600}>
                {editRow.slug}
              </Box>{' '}
              cannot be changed.
            </Typography>
            <TextField
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
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
        title={`Archive ${L.singular}?`}
        description={`Archiving hides this ${L.singular} from active pickers. You can restore it later from this list with “Show archived”.`}
        onCancel={() => setArchiveRow(null)}
        onConfirm={() => void confirmArchive()}
        loading={saving}
      />
    </Stack>
  );
}
