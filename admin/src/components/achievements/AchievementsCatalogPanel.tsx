'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { achievementsColumns } from '@/app/(dashboard)/achievements/achievementsColumns';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import {
  CATEGORY_LABELS,
  createAdminAchievement,
  deleteAdminAchievement,
  getAchievementCatalogOptions,
  listAdminAchievements,
  MODULE_LABELS,
  patchAdminAchievement,
  type AchievementCatalogOptions,
  type AdminAchievementItem,
} from '@/lib/achievements/achievementCatalogAdmin';

type AchievementsCatalogPanelProps = {
  token: string | null;
  canManage: boolean;
};

type DialogMode = 'create' | 'edit' | null;

export function AchievementsCatalogPanel({ token, canManage }: AchievementsCatalogPanelProps) {
  const [items, setItems] = useState<AdminAchievementItem[]>([]);
  const [configuredCount, setConfiguredCount] = useState(0);
  const [options, setOptions] = useState<AchievementCatalogOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editTarget, setEditTarget] = useState<AdminAchievementItem | null>(null);
  const [key, setKey] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AdminAchievementItem['category']>('engagement');
  const [module, setModule] = useState<AdminAchievementItem['module']>('engagement');
  const [metric, setMetric] = useState<AdminAchievementItem['metric']>('respect.given.total');
  const [target, setTarget] = useState('1');
  const [points, setPoints] = useState('10');
  const [unlocksAfter, setUnlocksAfter] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trashTarget, setTrashTarget] = useState<AdminAchievementItem | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [list, catalogOptions] = await Promise.all([
        listAdminAchievements(token),
        getAchievementCatalogOptions(token).catch(() => null),
      ]);
      setItems(list.items);
      setConfiguredCount(list.configuredCount);
      if (catalogOptions) setOptions(catalogOptions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(() => items.filter((i) => i.active).length, [items]);

  const prerequisiteOptions = useMemo(
    () => items.filter((i) => i.active && i.key !== editTarget?.key),
    [items, editTarget?.key]
  );

  function openCreate() {
    if (!canManage) return;
    setEditTarget(null);
    setKey('');
    setSlug('');
    setTitle('');
    setDescription('');
    setCategory('engagement');
    setModule('engagement');
    setMetric('respect.given.total');
    setTarget('1');
    setPoints('10');
    setUnlocksAfter('');
    setSortOrder(String(items.length + 1));
    setActive(true);
    setDialogMode('create');
  }

  function openEdit(row: AdminAchievementItem) {
    setEditTarget(row);
    setSlug(row.slug);
    setTitle(row.title);
    setDescription(row.description);
    setCategory(row.category);
    setModule(row.module);
    setMetric(row.metric);
    setTarget(String(row.target));
    setPoints(String(row.points));
    setUnlocksAfter(row.unlocksAfter ?? '');
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

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedSlug = slug.trim();
    const parsedTarget = Number.parseInt(target, 10);
    const parsedPoints = Number.parseInt(points, 10);
    const parsedSort = Number.parseInt(sortOrder, 10);

    if (!trimmedTitle || !trimmedDesc || !trimmedSlug) {
      setError('Title, description, and slug are required.');
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget < 1) {
      setError('Target must be at least 1.');
      return;
    }
    if (!Number.isFinite(parsedPoints) || parsedPoints < 0) {
      setError('Points must be zero or greater.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (dialogMode === 'create') {
        const trimmedKey = key.trim();
        if (!trimmedKey) {
          setError('Key is required.');
          setSaving(false);
          return;
        }
        await createAdminAchievement(token, {
          key: trimmedKey,
          slug: trimmedSlug,
          title: trimmedTitle,
          description: trimmedDesc,
          category,
          module,
          metric,
          target: parsedTarget,
          points: parsedPoints,
          unlocksAfter: unlocksAfter.trim() || null,
          sortOrder: Number.isFinite(parsedSort) ? parsedSort : 0,
          active,
        });
      } else if (editTarget) {
        await patchAdminAchievement(token, editTarget.id, {
          slug: trimmedSlug,
          title: trimmedTitle,
          description: trimmedDesc,
          category,
          module,
          metric,
          target: parsedTarget,
          points: parsedPoints,
          unlocksAfter: unlocksAfter.trim() || null,
          sortOrder: Number.isFinite(parsedSort) ? parsedSort : editTarget.sortOrder,
          active,
        });
      }
      closeDialog();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save achievement');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!token || !canManage || !trashTarget) return;
    setDeletingId(trashTarget.id);
    setError(null);
    try {
      await deleteAdminAchievement(token, trashTarget.id);
      setTrashTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to hide achievement');
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    () =>
      canManage
        ? achievementsColumns({
            onEdit: openEdit,
            onDelete: setTrashTarget,
            deletingId,
          })
        : achievementsColumns({
            onEdit: () => undefined,
            onDelete: () => undefined,
            deletingId: null,
          }).filter((c) => c.id !== 'actions'),
    [canManage, deletingId]
  );

  const categories = options?.categories ?? Object.keys(CATEGORY_LABELS);
  const modules = options?.modules ?? Object.keys(MODULE_LABELS);
  const metrics = options?.metrics ?? [metric];

  return (
    <Stack spacing={2}>
      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="Achievement catalog"
        right={
          canManage ? (
            <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={openCreate}>
              Add achievement
            </Button>
          ) : null
        }
      />

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage="No achievements configured yet."
        enablePagination
        pageSize={10}
        totalTextOverride={`${configuredCount} configured · ${activeCount} active`}
        dense
      />

      <AdminDialog
        open={dialogMode !== null}
        onClose={closeDialog}
        title={dialogMode === 'edit' ? 'Edit achievement' : 'Add achievement'}
        maxWidth="sm"
        primaryButton={{
          label: saving ? 'Saving…' : dialogMode === 'edit' ? 'Save' : 'Create',
          onClick: () => void submitDialog(),
          disabled: saving || !title.trim() || !description.trim() || !slug.trim(),
        }}
        secondaryButton={{
          label: 'Cancel',
          onClick: closeDialog,
          disabled: saving,
        }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {dialogMode === 'create' ? (
            <TextField
              label="Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              fullWidth
              autoFocus
              helperText="Stable id (e.g. respect-given-5). Cannot change after create."
              inputProps={{ maxLength: 64 }}
            />
          ) : editTarget ? (
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
              Key: {editTarget.key} (cannot change)
            </Typography>
          ) : null}

          <TextField
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            fullWidth
            autoFocus={dialogMode === 'edit'}
            helperText="URL-safe identifier shown in API responses"
            inputProps={{ maxLength: 64 }}
          />
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 120 }}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
            inputProps={{ maxLength: 280 }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="achievement-module-label">Linked module</InputLabel>
              <Select
                labelId="achievement-module-label"
                label="Linked module"
                value={module}
                onChange={(e) => setModule(e.target.value as AdminAchievementItem['module'])}
              >
                {modules.map((m) => (
                  <MenuItem key={m} value={m}>
                    {MODULE_LABELS[m as AdminAchievementItem['module']] ?? m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="achievement-category-label">Category</InputLabel>
              <Select
                labelId="achievement-category-label"
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AdminAchievementItem['category'])}
              >
                {categories.map((c) => (
                  <MenuItem key={c} value={c}>
                    {CATEGORY_LABELS[c as AdminAchievementItem['category']] ?? c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <FormControl fullWidth size="small">
            <InputLabel id="achievement-metric-label">Progress metric</InputLabel>
            <Select
              labelId="achievement-metric-label"
              label="Progress metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as AdminAchievementItem['metric'])}
            >
              {metrics.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              type="number"
              required
              fullWidth
              inputProps={{ min: 1, step: 1 }}
            />
            <TextField
              label="Points"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              type="number"
              required
              fullWidth
              inputProps={{ min: 0, step: 1 }}
            />
            <TextField
              label="Sort order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              type="number"
              fullWidth
              inputProps={{ step: 1 }}
            />
          </Stack>

          <FormControl fullWidth size="small">
            <InputLabel id="achievement-unlocks-label">Unlocks after (optional)</InputLabel>
            <Select
              labelId="achievement-unlocks-label"
              label="Unlocks after (optional)"
              value={unlocksAfter}
              onChange={(e) => setUnlocksAfter(e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {prerequisiteOptions.map((item) => (
                <MenuItem key={item.key} value={item.key}>
                  {item.title} ({item.key})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
            label="Active — visible on the user webapp"
          />
        </Stack>
      </AdminDialog>

      <ConfirmArchiveDialog
        open={Boolean(trashTarget)}
        title="Hide achievement?"
        description={
          trashTarget
            ? `Hide “${trashTarget.title}”. Users will no longer see it in the catalog, but existing unlocks are kept.`
            : ''
        }
        confirmLabel="Hide"
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={Boolean(deletingId)}
      />
    </Stack>
  );
}
