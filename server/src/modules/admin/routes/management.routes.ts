import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '../../../middlewares/auth/index.js';
import { staffManagementContext } from '../middleware/staffManagementContext.js';
import { requireAdminPermission } from '../middleware/requireAdminPermission.js';
import { requireAnyAdminPermission } from '../middleware/requireAnyAdminPermission.js';
import {
  getUsers,
  getUserById,
  searchUsers,
  patchUserProfile,
  postLockUser,
  postUnlockUser,
  postRevokeAllSessions,
} from '../controllers/managementUsers.controller.js';
import {
  getRoles,
  postRole,
  patchRole,
  deleteRoleSoft,
  postRoleRestore,
} from '../controllers/managementRoles.controller.js';
import {
  getAccessResources,
  postAccessResource,
  patchAccessResource,
  deleteAccessResourceSoft,
  postAccessResourceRestore,
  getAccessActions,
  postAccessAction,
  patchAccessAction,
  deleteAccessActionSoft,
  postAccessActionRestore,
  getAccessScopeTypes,
  postAccessScopeType,
  patchAccessScopeType,
  deleteAccessScopeTypeSoft,
  postAccessScopeTypeRestore,
  getAccessPermissions,
  postAccessPermission,
  patchAccessPermission,
  deleteAccessPermissionSoft,
  postAccessPermissionRestore,
} from '../controllers/managementAccessCatalog.controller.js';
import {
  getAdminUsers,
  postAdminUser,
  patchAdminUser,
} from '../controllers/managementAdminUsers.controller.js';
import {
  getFeedbackSubmissionById,
  listFeedbackSubmissions,
} from '../controllers/managementFeedback.controller.js';
import { getContactLeadById, listContactLeads } from '../controllers/managementContact.controller.js';

const read = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const write = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const sensitive = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Platform admin API — isolated from public user profile routes.
 * Base path: `/api/v1/admin/management` (see `routes/index.ts`).
 */
export const adminManagementRouter = Router();

adminManagementRouter.use(verifyToken, staffManagementContext);

adminManagementRouter.get(
  '/feedback-submissions',
  read,
  requireAdminPermission('feedback:read'),
  (req, res, next) => {
    void listFeedbackSubmissions(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/feedback-submissions/:id',
  read,
  requireAdminPermission('feedback:read'),
  (req, res, next) => {
    void getFeedbackSubmissionById(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/contact-leads',
  read,
  requireAdminPermission('contact_lead:read'),
  (req, res, next) => {
    void listContactLeads(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/contact-leads/:id',
  read,
  requireAdminPermission('contact_lead:read'),
  (req, res, next) => {
    void getContactLeadById(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/users',
  read,
  requireAdminPermission('user:list'),
  (req, res, next) => {
    void getUsers(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/users/search',
  read,
  requireAdminPermission('user:search'),
  (req, res, next) => {
    void searchUsers(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/users/:id',
  read,
  requireAdminPermission('user:read'),
  (req, res, next) => {
    void getUserById(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/users/:id',
  write,
  requireAdminPermission('user:update_profile'),
  (req, res, next) => {
    void patchUserProfile(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/users/:id/lock',
  sensitive,
  requireAdminPermission('user:lock'),
  (req, res, next) => {
    void postLockUser(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/users/:id/unlock',
  sensitive,
  requireAdminPermission('user:unlock'),
  (req, res, next) => {
    void postUnlockUser(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/users/:id/revoke-sessions',
  sensitive,
  requireAdminPermission('user:revoke_sessions'),
  (req, res, next) => {
    void postRevokeAllSessions(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/roles',
  read,
  requireAnyAdminPermission('admin_role:manage', 'admin_assignment:manage'),
  (req, res, next) => {
    void getRoles(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/roles',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postRole(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/roles/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void patchRole(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/roles/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void deleteRoleSoft(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/roles/:id/restore',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postRoleRestore(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/access-resources',
  read,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void getAccessResources(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-resources',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessResource(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/access-resources/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void patchAccessResource(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/access-resources/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void deleteAccessResourceSoft(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-resources/:id/restore',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessResourceRestore(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/access-actions',
  read,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void getAccessActions(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-actions',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessAction(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/access-actions/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void patchAccessAction(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/access-actions/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void deleteAccessActionSoft(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-actions/:id/restore',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessActionRestore(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/access-scope-types',
  read,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void getAccessScopeTypes(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-scope-types',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessScopeType(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/access-scope-types/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void patchAccessScopeType(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/access-scope-types/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void deleteAccessScopeTypeSoft(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-scope-types/:id/restore',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessScopeTypeRestore(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/access-permissions',
  read,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void getAccessPermissions(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-permissions',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessPermission(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/access-permissions/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void patchAccessPermission(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/access-permissions/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void deleteAccessPermissionSoft(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/access-permissions/:id/restore',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postAccessPermissionRestore(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/admin-users',
  read,
  requireAnyAdminPermission('admin_role:manage', 'admin_assignment:manage'),
  (req, res, next) => {
    void getAdminUsers(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/admin-users',
  write,
  requireAdminPermission('admin_assignment:manage'),
  (req, res, next) => {
    void postAdminUser(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/admin-users/:id',
  write,
  requireAdminPermission('admin_assignment:manage'),
  (req, res, next) => {
    void patchAdminUser(req, res).catch(next);
  }
);
