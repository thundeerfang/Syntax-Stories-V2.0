export { adminManagementRouter } from './rbac/routes/management.routes.js';
export { helpAdminRouter, helpPublicRouter } from './cms/help/help.routes.js';
export { legalAdminRouter, legalPublicRouter, legalUserRouter } from './cms/legal/legal.routes.js';
export { trashAdminRouter } from './cms/trash/trash.routes.js';
export { staffLogin } from './auth/staffLogin.controller.js';
export { runAdminPlatformSeeds } from './seeds/runAdminPlatformSeeds.js';
export { startPermissionInvalidationSubscriber } from './iam/permissionInvalidation.service.js';
export { startAuditStreamProcessor } from './iam/auditStream.service.js';
export { startAuthEmailQueueWorker } from './queues/authEmailQueue.js';
export { startAuthEmailBullmqWorker, enqueueAuthEmailBullmq } from './queues/authEmailBullmq.js';
export {
  requireStaff,
  isAdminRequest,
  type StaffRole,
} from './rbac/middleware/requireStaff.middleware.js';
export { SYNTAX_ADMIN_EMAIL } from './seeds/bootstrap.constants.js';
