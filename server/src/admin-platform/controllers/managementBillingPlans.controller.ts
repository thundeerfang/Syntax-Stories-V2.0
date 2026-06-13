import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { PaidPlanKey } from '../../variable/constants.js';
import {
  isPaidPlanKey,
  PAID_PLAN_KEY_VALIDATION_MESSAGE,
} from '../../variable/constants.js';
import { sendAdminError, sendAdminOk, type AdminErrorCode } from '../rbac/adminResponse.js';
import {
  PlanCatalogStoreError,
  createBillingPlanInStore,
  deleteBillingPlanFromStore,
  getAvailableBillingPlanKeysFromStore,
  listBillingPlansAdminFromStore,
  updateBillingPlanInStore,
} from '../../services/billing/planCatalogStore.js';

function parseFeatures(raw: unknown): string[] | null {
  if (Array.isArray(raw)) {
    const list = raw
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
      .slice(0, 24);
    return list.length ? list : null;
  }
  if (typeof raw === 'string') {
    const list = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 24);
    return list.length ? list : null;
  }
  return null;
}

function parsePlanKey(raw: unknown): PaidPlanKey | null {
  if (typeof raw !== 'string') return null;
  const k = raw.trim();
  return isPaidPlanKey(k) ? k : null;
}

export async function listBillingPlansAdmin(_req: Request, res: Response): Promise<void> {
  const items = await listBillingPlansAdminFromStore();
  sendAdminOk(res, { items });
}

export async function getAvailableBillingPlanKeys(_req: Request, res: Response): Promise<void> {
  const keys = await getAvailableBillingPlanKeysFromStore();
  sendAdminOk(res, { keys });
}

export async function postBillingPlan(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const key = parsePlanKey(body.key);
  if (!key) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', PAID_PLAN_KEY_VALIDATION_MESSAGE);
    return;
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const amountDisplay = typeof body.amountDisplay === 'string' ? body.amountDisplay.trim() : '';
  const cadence =
    typeof body.cadence === 'string' && body.cadence.trim()
      ? body.cadence.trim()
      : 'per month';
  const features = parseFeatures(body.features);

  if (!name || name.length > 80) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'name is required (max 80 characters)');
    return;
  }
  if (!description || description.length > 280) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'description is required (max 280 characters)');
    return;
  }
  if (!amountDisplay || amountDisplay.length > 32) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'amountDisplay is required');
    return;
  }
  if (!features) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'At least one feature is required');
    return;
  }

  const amountMinor =
    typeof body.amountMinor === 'number' && Number.isFinite(body.amountMinor)
      ? Math.max(0, Math.floor(body.amountMinor))
      : null;
  if (amountMinor === null) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'amountMinor must be a number (paise)');
    return;
  }

  const sortOrder =
    typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)
      ? Math.floor(body.sortOrder)
      : 0;
  const active = body.active === undefined ? true : Boolean(body.active);
  const mostPopular = Boolean(body.mostPopular);

  try {
    const item = await createBillingPlanInStore({
      key,
      name,
      description,
      amountDisplay,
      amountMinor,
      cadence,
      features,
      sortOrder,
      active,
      mostPopular,
    });
    sendAdminOk(res, { item });
  } catch (e) {
    if (e instanceof PlanCatalogStoreError) {
      sendAdminError(res, e.status, e.code as AdminErrorCode, e.message);
      return;
    }
    throw e;
  }
}

export async function patchBillingPlan(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid plan id');
    return;
  }

  const body = req.body as Record<string, unknown>;
  const patch: Parameters<typeof updateBillingPlanInStore>[1] = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 80) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'name must be 1–80 characters');
      return;
    }
    patch.name = name;
  }
  if (body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description || description.length > 280) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'description must be 1–280 characters');
      return;
    }
    patch.description = description;
  }
  if (body.amountDisplay !== undefined) {
    const amountDisplay = typeof body.amountDisplay === 'string' ? body.amountDisplay.trim() : '';
    if (!amountDisplay) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'amountDisplay is required');
      return;
    }
    patch.amountDisplay = amountDisplay;
  }
  if (body.amountMinor !== undefined) {
    if (typeof body.amountMinor !== 'number' || !Number.isFinite(body.amountMinor)) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'amountMinor must be a number');
      return;
    }
    patch.amountMinor = Math.max(0, Math.floor(body.amountMinor));
  }
  if (body.cadence !== undefined) {
    const cadence = typeof body.cadence === 'string' ? body.cadence.trim() : '';
    if (!cadence) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'cadence is required');
      return;
    }
    patch.cadence = cadence;
  }
  if (body.features !== undefined) {
    const features = parseFeatures(body.features);
    if (!features) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'At least one feature is required');
      return;
    }
    patch.features = features;
  }
  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== 'number' || !Number.isFinite(body.sortOrder)) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'sortOrder must be a number');
      return;
    }
    patch.sortOrder = Math.floor(body.sortOrder);
  }
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.mostPopular !== undefined) patch.mostPopular = Boolean(body.mostPopular);

  if (Object.keys(patch).length === 0) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'No fields to update');
    return;
  }

  try {
    const item = await updateBillingPlanInStore(id, patch);
    sendAdminOk(res, { item });
  } catch (e) {
    if (e instanceof PlanCatalogStoreError) {
      sendAdminError(res, e.status, e.code as AdminErrorCode, e.message);
      return;
    }
    throw e;
  }
}

export async function deleteBillingPlan(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid plan id');
    return;
  }

  try {
    const result = await deleteBillingPlanFromStore(id);
    sendAdminOk(res, result);
  } catch (e) {
    if (e instanceof PlanCatalogStoreError) {
      sendAdminError(res, e.status, e.code as AdminErrorCode, e.message);
      return;
    }
    throw e;
  }
}
