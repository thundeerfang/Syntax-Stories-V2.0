'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import { previewSlugFromDisplayName } from '@/lib/slug/slugifyDisplayName';
import {
  createFeedbackCategory,
  deleteFeedbackCategory,
  listFeedbackCategories,
  patchFeedbackCategory,
  type FeedbackCategoryItem,
} from '@/lib/api';
import { feedbackCategoriesColumns } from './feedbackCategoriesColumns';

type FeedbackCategoriesPanelProps = {
  token: string | null;
  canManage: boolean;
};

type DialogMode = 'create' | 'edit' | null;

export function FeedbackCategoriesPanel({ token, canManage }: FeedbackCategoriesPanelProps) {
  const [items, setItems] = useState<FeedbackCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editTarget, setEditTarget] = useState<FeedbackCategoryItem | null>(null);
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trashTarget, setTrashTarget] = useState<FeedbackCategoryItem | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listFeedbackCategories(token);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const slugPreview = useMemo(() => {
    if (dialogMode === 'edit' && editTarget) return editTarget.slug;
    return label.trim() ? previewSlugFromDisplayName(label, 64) : '';
  }, [dialogMode, editTarget, label]);

  function openCreate() {
    setEditTarget(null);
    setLabel('');
    setSortOrder('0');
    setActive(true);
    setDialogMode('create');
  }

  function openEdit(row: FeedbackCategoryItem) {
    setEditTarget(row);
    setLabel(row.label);
    setSortOrder(String(row.sortOrder));
    setActive(row.active);
    setDialogMode('edit');
  }

  function closeDialog() {
    if (saving) return;
    setDialogMode(null);
    setEditTarget(null);
  }

  async function submitDialog() {
    if (!token || !canManage) return;
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Enter a category label.');
      return;
    }
    const order = Number.parseInt(sortOrder, 10);
    setSaving(true);
    setError(null);
    try {
      if (dialogMode === 'create') {
        await createFeedbackCategory(token, {
          label: trimmed,
          sortOrder: Number.isFinite(order) ? order : 0,
        });
      } else if (dialogMode === 'edit' && editTarget) {
        await patchFeedbackCategory(token, editTarget.id, {
          label: trimmed,
          sortOrder: Number.isFinite(order) ? order : 0,
          active,
        });
      }
      closeDialog();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!token || !canManage || !trashTarget) return;
    setDeletingId(trashTarget.id);
    setError(null);
    try {
      const result = await deleteFeedbackCategory(token, trashTarget.id);
      setTrashTarget(null);
      if (result.deactivated && result.submissionCount) {
        setError(
          `Category hidden from the form (${result.submissionCount} submission(s) still reference it).`
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    () =>
      canManage
        ? feedbackCategoriesColumns({
            deletingId,
            onEdit: openEdit,
            onDelete: (row) => setTrashTarget(row),
          })
        : feedbackCategoriesColumns({
            deletingId: null,
            onEdit: () => {},
            onDelete: () => {},
          }).filter((c) => c.id !== 'actions'),
    [canManage, deletingId]
  );

  return (
    <Stack spacing={2}>
      {error ? (
        <AdminFeedbackMessage
          severity={error.includes('hidden') ? 'warning' : 'error'}
          message={error}
          onClose={() => setError(null)}
        />
      ) : null}

      <AdminBlinkSectionHeader
        title="Categories"
        right={
          canManage ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={openCreate}
            >
              Add category
            </Button>
          ) : null
        }
      />

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage={canManage ? 'No categories yet. Add one.' : 'No categories configured.'}
        enablePagination={false}
        showTotal={false}
        dense
      />

      <AdminDialog
        open={dialogMode !== null}
        onClose={closeDialog}
        title={dialogMode === 'edit' ? 'Edit category' : 'Add category'}
        maxWidth="sm"
        primaryButton={{
          label: saving ? 'Saving…' : dialogMode === 'edit' ? 'Save' : 'Create',
          onClick: () => void submitDialog(),
          disabled: saving || !label.trim(),
        }}
        secondaryButton={{
          label: 'Cancel',
          onClick: closeDialog,
          disabled: saving,
        }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            fullWidth
            autoFocus
            placeholder="e.g. Bug report"
          />
          {slugPreview ? (
            <Typography variant="caption" color="text.secondary">
              Public slug: <code>{slugPreview}</code>
              {dialogMode === 'edit' ? ' (slug does not change on edit)' : ''}
            </Typography>
          ) : null}
          <TextField
            label="Sort order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            type="number"
            fullWidth
            inputProps={{ step: 1 }}
          />
          {dialogMode === 'edit' ? (
            <FormControlLabel
              control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
              label="Visible on feedback form"
            />
          ) : null}
        </Stack>
      </AdminDialog>

      <ConfirmArchiveDialog
        open={Boolean(trashTarget)}
        title="Delete category?"
        description={
          trashTarget
            ? `Remove “${trashTarget.label}”. If submissions use this category, it will be hidden instead of deleted.`
            : ''
        }
        confirmLabel="Delete"
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={Boolean(deletingId)}
      />
    </Stack>
  );
}
