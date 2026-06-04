'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
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
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import { subscriptionPlansColumns } from '@/app/(dashboard)/subscriptions/subscriptionPlansColumns';
import {
  createAdminBillingPlan,
  deleteAdminBillingPlan,
  listAdminBillingPlans,
  listAvailableBillingPlanKeys,
  patchAdminBillingPlan,
  type AdminBillingPlanItem,
} from '@/lib/billing/billingPlanCatalogAdmin';

export type SubscriptionPlansPanelHandle = {
  openAddPlan: () => void;
};

type SubscriptionPlansPanelProps = {
  token: string | null;
  canManage: boolean;
};

type DialogMode = 'create' | 'edit' | null;

const PLAN_KEY_LABELS: Record<AdminBillingPlanItem['key'], string> = {
  pro: 'Pro',
  proplus: 'Pro Plus',
  ultra: 'Ultra',
};

function featuresToText(features: string[]): string {
  return features.join('\n');
}

function parseAmountMinor(display: string, fallback: number): number {
  const digits = display.replace(/[^\d]/g, '');
  if (!digits) return fallback;
  const rupees = Number.parseInt(digits, 10);
  return Number.isFinite(rupees) ? rupees * 100 : fallback;
}

export const SubscriptionPlansPanel = forwardRef<
  SubscriptionPlansPanelHandle,
  SubscriptionPlansPanelProps
>(function SubscriptionPlansPanel({ token, canManage }, ref) {
  const [items, setItems] = useState<AdminBillingPlanItem[]>([]);
  const [availableKeys, setAvailableKeys] = useState<AdminBillingPlanItem['key'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editTarget, setEditTarget] = useState<AdminBillingPlanItem | null>(null);
  const [planKey, setPlanKey] = useState<AdminBillingPlanItem['key']>('pro');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [cadence, setCadence] = useState('per month');
  const [featuresText, setFeaturesText] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [mostPopular, setMostPopular] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingPopularId, setTogglingPopularId] = useState<string | null>(null);
  const [trashTarget, setTrashTarget] = useState<AdminBillingPlanItem | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [list, keys] = await Promise.all([
        listAdminBillingPlans(token),
        canManage
          ? listAvailableBillingPlanKeys(token).catch(() => [] as AdminBillingPlanItem['key'][])
          : Promise.resolve([]),
      ]);
      setItems(list);
      setAvailableKeys(keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [token, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    if (!canManage) return;
    if (availableKeys.length === 0) {
      setError('All plan slots (Pro, Pro Plus, Ultra) are in use. Delete a plan to free a slot.');
      return;
    }
    setEditTarget(null);
    setPlanKey(availableKeys[0] ?? 'pro');
    setName('');
    setDescription('');
    setAmountDisplay('');
    setCadence('per month');
    setFeaturesText('');
    setSortOrder(String(items.length));
    setActive(true);
    setMostPopular(false);
    setDialogMode('create');
  }, [canManage, availableKeys, items.length]);

  useImperativeHandle(ref, () => ({ openAddPlan: openCreate }), [openCreate]);

  function openEdit(row: AdminBillingPlanItem) {
    setEditTarget(row);
    setName(row.name);
    setDescription(row.description);
    setAmountDisplay(row.amountDisplay);
    setCadence(row.cadence);
    setFeaturesText(featuresToText(row.features));
    setSortOrder(String(row.sortOrder));
    setActive(row.active);
    setMostPopular(row.featured);
    setDialogMode('edit');
  }

  function closeDialog() {
    if (saving) return;
    setDialogMode(null);
    setEditTarget(null);
  }

  async function submitDialog() {
    if (!token || !canManage) return;
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const trimmedAmount = amountDisplay.trim();
    const featureLines = featuresText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!trimmedName || !trimmedDesc || !trimmedAmount || featureLines.length === 0) {
      setError('Name, description, amount, and at least one feature are required.');
      return;
    }

    const order = Number.parseInt(sortOrder, 10);
    const amountMinor = parseAmountMinor(trimmedAmount, editTarget?.amountMinor ?? 0);

    setSaving(true);
    setError(null);
    try {
      if (dialogMode === 'create') {
        await createAdminBillingPlan(token, {
          key: planKey,
          name: trimmedName,
          description: trimmedDesc,
          amountDisplay: trimmedAmount,
          amountMinor,
          cadence: cadence.trim() || 'per month',
          features: featureLines,
          sortOrder: Number.isFinite(order) ? order : 0,
          active,
          mostPopular,
        });
      } else if (dialogMode === 'edit' && editTarget) {
        await patchAdminBillingPlan(token, editTarget.id, {
          name: trimmedName,
          description: trimmedDesc,
          amountDisplay: trimmedAmount,
          amountMinor,
          cadence: cadence.trim() || 'per month',
          features: featureLines,
          sortOrder: Number.isFinite(order) ? order : 0,
          active,
          mostPopular,
        });
      }
      closeDialog();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleMostPopular(row: AdminBillingPlanItem, next: boolean) {
    if (!token || !canManage) return;
    setTogglingPopularId(row.id);
    setError(null);

    setItems((prev) =>
      prev.map((p) => {
        if (p.id === row.id) {
          return {
            ...p,
            featured: next,
            badge: next ? 'Most popular' : null,
          };
        }
        if (next) {
          return { ...p, featured: false, badge: null };
        }
        return p;
      })
    );

    try {
      await patchAdminBillingPlan(token, row.id, { mostPopular: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update most popular');
      await load();
    } finally {
      setTogglingPopularId(null);
    }
  }

  async function confirmDelete() {
    if (!token || !canManage || !trashTarget) return;
    setDeletingId(trashTarget.id);
    setError(null);
    try {
      const result = await deleteAdminBillingPlan(token, trashTarget.id);
      setTrashTarget(null);
      if (result.deactivated && result.subscriptionCount) {
        setError(
          `Plan hidden from pricing (${result.subscriptionCount} active subscription(s) still use it).`
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete plan');
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    () =>
      canManage
        ? subscriptionPlansColumns({
            deletingId,
            togglingPopularId,
            onEdit: openEdit,
            onDelete: (row) => setTrashTarget(row),
            onToggleMostPopular: (row, next) => void onToggleMostPopular(row, next),
          })
        : subscriptionPlansColumns({
            deletingId: null,
            togglingPopularId: null,
            onEdit: () => {},
            onDelete: () => {},
            onToggleMostPopular: () => {},
          }).filter((c) => c.id !== 'actions' && c.id !== 'mostPopular'),
    [canManage, deletingId, togglingPopularId, items]
  );

  const addPlanDisabled = availableKeys.length === 0;
  const addPlanButton = (
    <Tooltip
      title={
        addPlanDisabled
          ? 'Pro, Pro Plus, and Ultra slots are all in use — delete a plan to add another'
          : 'Add a new subscription plan'
      }
    >
      <span>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={openCreate}
          disabled={addPlanDisabled}
        >
          Add plan
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <Stack spacing={2}>
      {error ? (
        <AdminFeedbackMessage
          severity={error.includes('hidden') || error.includes('slots') ? 'warning' : 'error'}
          message={error}
          onClose={() => setError(null)}
        />
      ) : null}

      {!canManage ? (
        <Typography variant="body2" color="text.secondary">
          You have read-only access. Ask an admin for the{' '}
          <Typography component="span" variant="body2" fontFamily="monospace">
            billing:manage_plans
          </Typography>{' '}
          permission to add, edit, delete, or set most popular.
        </Typography>
      ) : null}

      <AdminBlinkSectionHeader
        title="Subscription plans"
        right={canManage ? addPlanButton : null}
      />

      <AdminDataTable
        data={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        emptyMessage="No plans configured."
        enablePagination={false}
        showTotal={false}
        dense
      />

      <AdminDialog
        open={dialogMode !== null}
        onClose={closeDialog}
        title={dialogMode === 'edit' ? 'Edit plan' : 'Add plan'}
        maxWidth="sm"
        primaryButton={{
          label: saving ? 'Saving…' : dialogMode === 'edit' ? 'Save' : 'Create',
          onClick: () => void submitDialog(),
          disabled: saving || !name.trim() || !description.trim() || !amountDisplay.trim(),
        }}
        secondaryButton={{
          label: 'Cancel',
          onClick: closeDialog,
          disabled: saving,
        }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {dialogMode === 'create' ? (
            <FormControl fullWidth size="small">
              <InputLabel id="plan-key-label">Plan slot</InputLabel>
              <Select
                labelId="plan-key-label"
                label="Plan slot"
                value={planKey}
                onChange={(e) => setPlanKey(e.target.value as AdminBillingPlanItem['key'])}
              >
                {availableKeys.map((k) => (
                  <MenuItem key={k} value={k}>
                    {PLAN_KEY_LABELS[k]} ({k})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : editTarget ? (
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
              Slot: {editTarget.key} (cannot change)
            </Typography>
          ) : null}

          <TextField
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Subtitle"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Amount display"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)}
              required
              fullWidth
              placeholder="₹500"
              helperText="Shown on pricing cards"
            />
            <TextField
              label="Cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              fullWidth
              placeholder="per month"
            />
          </Stack>
          <TextField
            label="Features (one per line)"
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            required
            fullWidth
            multiline
            minRows={4}
          />
          <TextField
            label="Sort order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            type="number"
            fullWidth
            inputProps={{ step: 1 }}
          />
          <FormControlLabel
            control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
            label="Visible on public pricing page"
          />
          <FormControlLabel
            control={
              <Switch checked={mostPopular} onChange={(e) => setMostPopular(e.target.checked)} />
            }
            label="Most popular (shows badge on pricing page)"
          />
        </Stack>
      </AdminDialog>

      <ConfirmArchiveDialog
        open={Boolean(trashTarget)}
        title="Delete plan?"
        description={
          trashTarget
            ? `Remove “${trashTarget.name}”. If active subscriptions exist, the plan will be hidden instead of deleted.`
            : ''
        }
        confirmLabel="Delete"
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={Boolean(deletingId)}
      />
    </Stack>
  );
});
