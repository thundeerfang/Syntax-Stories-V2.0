import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '../../../middlewares/auth/index.js';
import { staffManagementContext } from '../middleware/staffManagementContext.js';
import { requireAdminPermission } from '../middleware/requireAdminPermission.js';
import { requireAnyAdminPermission } from '../middleware/requireAnyAdminPermission.js';
import {
  getUsers,
  getUserById,
  getUserFollows,
  getUserLedger,
  searchUsers,
  patchUserProfile,
  postLockUser,
  postUnlockUser,
  postRevokeAllSessions,
} from '../../controllers/managementUsers.controller.js';
import { getBlogById, listBlogs } from '../../controllers/managementBlog.controller.js';
import {
  deleteBlogAsAdmin,
  restoreBlogAsAdmin,
  suspendBlogAsAdmin,
  unsuspendBlogAsAdmin,
} from '../../controllers/managementBlogModeration.controller.js';
import { getBlogEngagementByMetric } from '../../controllers/managementBlogEngagement.controller.js';
import {
  getBlogCategoryByRef,
  getBlogTagByRef,
  listBlogCategories,
  listBlogTags,
  patchBlogCategory,
  patchBlogTag,
  postBlogCategory,
  postBlogCategoryBulk,
  postBlogTag,
  postBlogTagBulk,
} from '../../controllers/managementBlogTaxonomy.controller.js';
import {
  getRoles,
  postRole,
  patchRole,
  deleteRoleSoft,
  postRoleRestore,
} from '../../controllers/managementRoles.controller.js';
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
} from '../../controllers/managementAccessCatalog.controller.js';
import {
  getAdminUsers,
  postAdminUser,
  patchAdminUser,
} from '../../controllers/managementAdminUsers.controller.js';
import {
  postAdminInviteSendOtp,
  postAdminInviteVerifyOtp,
} from '../../controllers/managementAdminInvite.controller.js';
import {
  getFeedbackSubmissionById,
  listFeedbackSubmissions,
} from '../../controllers/managementFeedback.controller.js';
import {
  deleteFeedbackCategory,
  listFeedbackCategoriesAdmin,
  patchFeedbackCategory,
  postFeedbackCategory,
} from '../../controllers/managementFeedbackCategories.controller.js';
import {
  deleteBillingPlan,
  getAvailableBillingPlanKeys,
  listBillingPlansAdmin,
  patchBillingPlan,
  postBillingPlan,
} from '../../controllers/managementBillingPlans.controller.js';
import {
  deleteAchievement,
  getAchievementCatalogOptions,
  listAchievementsAdmin,
  patchAchievement,
  postAchievement,
} from '../../controllers/managementAchievements.controller.js';
import {
  getAdminNotificationConfig,
  getAdminNotificationStats,
  listAdminNotificationAudit,
  patchAdminNotificationConfig,
  postAdminNotificationWebhookTest,
} from '../../controllers/managementNotifications.controller.js';
import {
  getContactLeadById,
  listContactLeads,
} from '../../controllers/managementContact.controller.js';
import {
  getSessionIdleStatus,
  postSessionTouch,
} from '../../controllers/managementSessionIdle.controller.js';
import { getManagementMe } from '../../controllers/managementMe.controller.js';
import {
  listMySessions,
  revokeMySession,
  revokeOtherSessions,
} from '../../controllers/managementSessions.controller.js';
import { listAuditLogs } from '../../controllers/managementAudit.controller.js';
import { getIamMetricsHandler } from '../../controllers/managementIamMetrics.controller.js';
import { postIamSimulate } from '../../controllers/managementSimulate.controller.js';
import {
  listMyTrustedDevices,
  postTrustCurrentDevice,
  deleteTrustedDevice,
} from '../../controllers/managementDevices.controller.js';
import {
  postImpersonateUser,
  postEndImpersonation,
} from '../../controllers/managementImpersonation.controller.js';
import { getFederationHandler } from '../../controllers/managementFederation.controller.js';
import { getSessionRisk } from '../../controllers/managementRisk.controller.js';
import {
  listElevations,
  postElevation,
  deleteElevation,
} from '../../controllers/managementTemporal.controller.js';
import { requireSessionTier } from '../middleware/requireSessionTier.js';

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

adminManagementRouter.get('/me', read, (req, res, next) => {
  void getManagementMe(req, res).catch(next);
});

adminManagementRouter.get('/session-idle', read, (req, res, next) => {
  void getSessionIdleStatus(req, res).catch(next);
});

adminManagementRouter.post('/session-touch', write, (req, res, next) => {
  void postSessionTouch(req, res).catch(next);
});

adminManagementRouter.get('/sessions', read, (req, res, next) => {
  void listMySessions(req, res).catch(next);
});

adminManagementRouter.delete('/sessions/:sessionId', sensitive, (req, res, next) => {
  void revokeMySession(req, res).catch(next);
});

adminManagementRouter.post('/sessions/revoke-others', sensitive, (req, res, next) => {
  void revokeOtherSessions(req, res).catch(next);
});

adminManagementRouter.get(
  '/iam-metrics',
  read,
  requireAdminPermission('audit:read'),
  (req, res, next) => {
    void getIamMetricsHandler(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/iam/simulate',
  write,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void postIamSimulate(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/federation',
  read,
  requireAdminPermission('audit:read'),
  (req, res, next) => {
    void getFederationHandler(req, res).catch(next);
  }
);

adminManagementRouter.get('/risk', read, (req, res, next) => {
  void getSessionRisk(req, res).catch(next);
});

adminManagementRouter.get(
  '/iam/elevations',
  read,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void listElevations(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/iam/elevations',
  sensitive,
  requireAdminPermission('admin_role:manage'),
  requireSessionTier('root'),
  (req, res, next) => {
    void postElevation(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/iam/elevations/:id',
  sensitive,
  requireAdminPermission('admin_role:manage'),
  (req, res, next) => {
    void deleteElevation(req, res).catch(next);
  }
);

adminManagementRouter.get('/devices', read, (req, res, next) => {
  void listMyTrustedDevices(req, res).catch(next);
});

adminManagementRouter.post('/devices/trust-current', sensitive, (req, res, next) => {
  void postTrustCurrentDevice(req, res).catch(next);
});

adminManagementRouter.delete('/devices/:deviceId', sensitive, (req, res, next) => {
  void deleteTrustedDevice(req, res).catch(next);
});

adminManagementRouter.post('/impersonation/end', sensitive, (req, res, next) => {
  void postEndImpersonation(req, res).catch(next);
});

adminManagementRouter.get(
  '/audit-logs',
  read,
  requireAdminPermission('audit:read'),
  (req, res, next) => {
    void listAuditLogs(req, res).catch(next);
  }
);

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
  '/feedback-categories',
  read,
  requireAdminPermission('feedback:read'),
  (req, res, next) => {
    void listFeedbackCategoriesAdmin(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/feedback-categories',
  read,
  requireAnyAdminPermission('feedback:manage', 'feedback:read'),
  (req, res, next) => {
    void postFeedbackCategory(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/feedback-categories/:id',
  read,
  requireAnyAdminPermission('feedback:manage', 'feedback:read'),
  (req, res, next) => {
    void patchFeedbackCategory(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/feedback-categories/:id',
  read,
  requireAnyAdminPermission('feedback:manage', 'feedback:read'),
  (req, res, next) => {
    void deleteFeedbackCategory(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/billing-plans',
  read,
  requireAdminPermission('billing:read_subscription'),
  (req, res, next) => {
    void listBillingPlansAdmin(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/billing-plans/available-keys',
  read,
  requireAdminPermission('billing:read_subscription'),
  (req, res, next) => {
    void getAvailableBillingPlanKeys(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/billing-plans',
  read,
  requireAnyAdminPermission('billing:manage_plans', 'billing:sync_subscription'),
  (req, res, next) => {
    void postBillingPlan(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/billing-plans/:id',
  read,
  requireAnyAdminPermission('billing:manage_plans', 'billing:sync_subscription'),
  (req, res, next) => {
    void patchBillingPlan(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/billing-plans/:id',
  read,
  requireAnyAdminPermission('billing:manage_plans', 'billing:sync_subscription'),
  (req, res, next) => {
    void deleteBillingPlan(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/achievements',
  read,
  requireAdminPermission('achievement:list'),
  (req, res, next) => {
    void listAchievementsAdmin(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/achievements/options',
  read,
  requireAdminPermission('achievement:list'),
  (req, res, next) => {
    void getAchievementCatalogOptions(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/achievements',
  read,
  requireAdminPermission('achievement:manage'),
  (req, res, next) => {
    void postAchievement(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/achievements/:id',
  read,
  requireAdminPermission('achievement:manage'),
  (req, res, next) => {
    void patchAchievement(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/achievements/:id',
  read,
  requireAdminPermission('achievement:manage'),
  (req, res, next) => {
    void deleteAchievement(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/notifications/config',
  read,
  requireAdminPermission('notification:read'),
  (req, res, next) => {
    void getAdminNotificationConfig(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/notifications/config',
  read,
  requireAdminPermission('notification:manage'),
  requireSessionTier('root'),
  (req, res, next) => {
    void patchAdminNotificationConfig(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/notifications/stats',
  read,
  requireAdminPermission('notification:read'),
  (req, res, next) => {
    void getAdminNotificationStats(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/notifications/audit',
  read,
  requireAdminPermission('notification:read'),
  (req, res, next) => {
    void listAdminNotificationAudit(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/notifications/webhook/test',
  read,
  requireAdminPermission('notification:manage'),
  requireSessionTier('root'),
  (req, res, next) => {
    void postAdminNotificationWebhookTest(req, res).catch(next);
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

adminManagementRouter.get('/users', read, requireAdminPermission('user:list'), (req, res, next) => {
  void getUsers(req, res).catch(next);
});

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

adminManagementRouter.get(
  '/users/:id/ledger',
  read,
  requireAdminPermission('billing:read_ledger'),
  (req, res, next) => {
    void getUserLedger(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/users/:id/follows',
  read,
  requireAdminPermission('user:read'),
  (req, res, next) => {
    void getUserFollows(req, res).catch(next);
  }
);

adminManagementRouter.get('/blogs', read, requireAdminPermission('blog:list'), (req, res, next) => {
  void listBlogs(req, res).catch(next);
});

adminManagementRouter.get(
  '/blogs/:id',
  read,
  requireAdminPermission('blog:read'),
  (req, res, next) => {
    void getBlogById(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/blogs/:id/engagement/:metric',
  read,
  requireAdminPermission('blog:read'),
  (req, res, next) => {
    void getBlogEngagementByMetric(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/blogs/:id/suspend',
  read,
  requireAdminPermission('blog:read'),
  (req, res, next) => {
    void suspendBlogAsAdmin(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/blogs/:id/unsuspend',
  read,
  requireAdminPermission('blog:read'),
  (req, res, next) => {
    void unsuspendBlogAsAdmin(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/blogs/:id/restore',
  read,
  requireAdminPermission('blog:read'),
  (req, res, next) => {
    void restoreBlogAsAdmin(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/blogs/:id',
  read,
  requireAdminPermission('blog:read'),
  (req, res, next) => {
    void deleteBlogAsAdmin(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/blog-categories',
  read,
  requireAdminPermission('blog_category:list'),
  (req, res, next) => {
    void listBlogCategories(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/blog-categories/:ref',
  read,
  requireAdminPermission('blog_category:read'),
  (req, res, next) => {
    void getBlogCategoryByRef(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/blog-categories/bulk',
  write,
  requireAdminPermission('blog_category:manage'),
  (req, res, next) => {
    void postBlogCategoryBulk(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/blog-categories',
  write,
  requireAdminPermission('blog_category:manage'),
  (req, res, next) => {
    void postBlogCategory(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/blog-categories/:ref',
  write,
  requireAdminPermission('blog_category:manage'),
  (req, res, next) => {
    void patchBlogCategory(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/blog-tags',
  read,
  requireAdminPermission('blog_tag:list'),
  (req, res, next) => {
    void listBlogTags(req, res).catch(next);
  }
);

adminManagementRouter.get(
  '/blog-tags/:ref',
  read,
  requireAdminPermission('blog_tag:read'),
  (req, res, next) => {
    void getBlogTagByRef(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/blog-tags/bulk',
  write,
  requireAdminPermission('blog_tag:manage'),
  (req, res, next) => {
    void postBlogTagBulk(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/blog-tags',
  write,
  requireAdminPermission('blog_tag:manage'),
  (req, res, next) => {
    void postBlogTag(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/blog-tags/:ref',
  write,
  requireAdminPermission('blog_tag:manage'),
  (req, res, next) => {
    void patchBlogTag(req, res).catch(next);
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

adminManagementRouter.post(
  '/users/:id/impersonate',
  sensitive,
  requireAdminPermission('user:impersonate'),
  (req, res, next) => {
    void postImpersonateUser(req, res).catch(next);
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
  requireSessionTier('root'),
  (req, res, next) => {
    void postRole(req, res).catch(next);
  }
);

adminManagementRouter.patch(
  '/roles/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  requireSessionTier('root'),
  (req, res, next) => {
    void patchRole(req, res).catch(next);
  }
);

adminManagementRouter.delete(
  '/roles/:id',
  write,
  requireAdminPermission('admin_role:manage'),
  requireSessionTier('root'),
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
  '/admin-users/send-invite-otp',
  sensitive,
  requireAdminPermission('admin_assignment:manage'),
  (req, res, next) => {
    void postAdminInviteSendOtp(req, res).catch(next);
  }
);

adminManagementRouter.post(
  '/admin-users/verify-invite-otp',
  sensitive,
  requireAdminPermission('admin_assignment:manage'),
  (req, res, next) => {
    void postAdminInviteVerifyOtp(req, res).catch(next);
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
