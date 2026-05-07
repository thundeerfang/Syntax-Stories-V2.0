import { ADMIN_PERMISSIONS } from '../adminPermissions.js';
import { AdminAccessPermissionModel } from '../models/AdminAccessPermission.js';
import { AdminResourceModel } from '../models/AdminResource.js';
import { AdminActionTypeModel } from '../models/AdminActionType.js';
import { AdminScopeTypeModel } from '../models/AdminScopeType.js';

function keyToParts(key: string): { resource: string; action: string; type: string } {
  const idx = key.indexOf(':');
  if (idx > 0) {
    return {
      resource: key.slice(0, idx),
      action: key.slice(idx + 1),
      type: 'management',
    };
  }
  return { resource: 'platform', action: key, type: 'management' };
}

/** Idempotent: scope type, resources, actions, and permission rows from the canonical key list. */
export async function ensureAdminAccessCatalogSeed(): Promise<void> {
  await AdminScopeTypeModel.updateOne(
    { slug: 'management' },
    {
      $set: {
        displayName: 'Management',
        description: 'Standard dashboard / management API permissions.',
        sortOrder: 0,
        deletedAt: null,
        deletedById: null,
      },
    },
    { upsert: true }
  );

  const resources = new Set<string>();
  const actions = new Set<string>();
  for (const key of ADMIN_PERMISSIONS) {
    const { resource, action } = keyToParts(key);
    resources.add(resource);
    actions.add(action);
  }

  let rs = 0;
  for (const slug of [...resources].sort()) {
    await AdminResourceModel.updateOne(
      { slug },
      {
        $set: {
          displayName: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' '),
          sortOrder: rs++,
          deletedAt: null,
          deletedById: null,
        },
      },
      { upsert: true }
    );
  }

  let as = 0;
  for (const slug of [...actions].sort()) {
    await AdminActionTypeModel.updateOne(
      { slug },
      {
        $set: {
          displayName: slug.replace(/_/g, ' '),
          sortOrder: as++,
          deletedAt: null,
          deletedById: null,
        },
      },
      { upsert: true }
    );
  }

  for (const key of ADMIN_PERMISSIONS) {
    const { resource, action, type } = keyToParts(key);
    await AdminAccessPermissionModel.updateOne(
      { key },
      {
        $set: {
          resource,
          action,
          type,
          key,
          sortOrder: 0,
          deletedAt: null,
          deletedById: null,
        },
      },
      { upsert: true }
    );
  }
}
