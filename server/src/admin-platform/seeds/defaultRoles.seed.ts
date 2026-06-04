import { ADMIN_PERMISSIONS } from '../rbac/adminPermissions.js';
import { AdminRoleModel } from '../rbac/models/AdminRole.js';
import { invalidateAllStaffAdminPermissionCaches } from '../rbac/services/rbac.service.js';

const ALL_PERMISSIONS = [...ADMIN_PERMISSIONS];

const PLATFORM_ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter(
  (p) => p !== 'admin_role:manage' && p !== 'admin_assignment:manage'
);

const SUPPORT_PERMISSIONS = [
  'user:list',
  'user:read',
  'user:search',
  'blog:list',
  'blog:read',
  'blog_category:list',
  'blog_category:read',
  'blog_tag:list',
  'blog_tag:read',
  'feedback:read',
  'contact_lead:read',
  'billing:read_subscription',
  'billing:read_ledger',
  'achievement:list',
] as const;

const FINANCE_PERMISSIONS = ['billing:manage_plans', 'billing:sync_subscription'] as const;

const CONTENT_EDITOR_PERMISSIONS = [
  'feedback:read',
  'feedback:manage',
  'blog:read_metrics',
  'blog:list',
  'blog:read',
  'blog_category:list',
  'blog_category:read',
  'blog_category:manage',
  'blog_tag:list',
  'blog_tag:read',
  'blog_tag:manage',
  'help:manage',
  'legal:manage',
  'trash:manage',
  'achievement:list',
  'achievement:manage',
] as const;

const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    level: 1000,
    description: 'Full platform access including role and operator management.',
    permissions: ALL_PERMISSIONS,
    systemProtected: true,
  },
  {
    name: 'Platform Admin',
    level: 500,
    description: 'Day-to-day operations without RBAC configuration.',
    permissions: PLATFORM_ADMIN_PERMISSIONS,
  },
  {
    name: 'Support',
    level: 200,
    description: 'User lookup, feedback, contact leads, and billing read access.',
    permissions: [...SUPPORT_PERMISSIONS],
  },
  {
    name: 'Content Editor',
    level: 100,
    description: 'Content metrics and CMS access via staff role.',
    permissions: [...CONTENT_EDITOR_PERMISSIONS],
  },
  {
    name: 'Finance',
    level: 300,
    description: 'Subscription plan catalog and Stripe billing operations.',
    permissions: [
      'billing:read_subscription',
      'billing:read_ledger',
      'billing:open_stripe_customer',
      ...FINANCE_PERMISSIONS,
    ],
  },
] as const;

/** Idempotent upsert of system default roles. */
export async function seedDefaultRoles(): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    await AdminRoleModel.updateOne(
      { name: role.name, deletedAt: null },
      {
        $set: {
          level: role.level,
          description: role.description,
          permissions: role.permissions,
          systemProtected: 'systemProtected' in role ? Boolean(role.systemProtected) : false,
          deletedAt: null,
          deletedById: null,
        },
      },
      { upsert: true }
    );
  }
  await invalidateAllStaffAdminPermissionCaches();
  console.log(`[seed] Admin default roles: ${DEFAULT_ROLES.map((r) => r.name).join(', ')}`);
}
