import { Router } from 'express';
import healthRoutes from './health.routes.js';
import followRoutes from './follow.routes.js';
import referenceRoutes from './reference.routes.js';
import notificationsRoutes from './notifications.routes.js';
import githubRoutes from './github.routes.js';
import analyticsRoutes from './analytics.routes.js';
import blogRoutes from './blog.routes.js';
import bookmarkRoutes from './bookmark.routes.js';
import repostRoutes from './repost.routes.js';
import squadRoutes from './squad.routes.js';
import sessionWebhookRoutes from '../webhooks/session/session.routes.js';
import operationalWebhookRoutes from '../webhooks/operational/operational.routes.js';
import feedbackRoutes from './feedback.routes.js';
import contactRoutes from './contact.routes.js';
import inviteRoutes from './invite.routes.js';
import billingRoutes from './billing.routes.js';
import achievementsRoutes from './achievements.routes.js';
import searchRoutes from './search.routes.js';
import mediaRoutes from './media.routes.js';
import platformRoutes from './platform.routes.js';
import {
  adminManagementRouter,
  legalAdminRouter,
  legalPublicRouter,
  legalUserRouter,
  trashAdminRouter,
} from '../admin-platform/index.js';
import { samlAdminRouter } from '../admin-platform/federation/saml.routes.js';
import { scimAdminRouter } from '../admin-platform/federation/scim.routes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/follow', followRoutes);
router.use('/reference', referenceRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/github', githubRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/blog', blogRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/reposts', repostRoutes);
router.use('/squads', squadRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/contact', contactRoutes);
router.use('/invites', inviteRoutes);
router.use('/billing', billingRoutes);
router.use('/achievements', achievementsRoutes);
router.use('/search', searchRoutes);
router.use('/media', mediaRoutes);
router.use('/platform', platformRoutes);
router.use('/v1/admin/trash', trashAdminRouter);
router.use('/v1/admin/management', adminManagementRouter);
router.use('/v1/admin/saml', samlAdminRouter);
router.use('/v1/admin/scim/v2', scimAdminRouter);
router.use('/v1/legal', legalPublicRouter);
router.use('/v1/legal', legalUserRouter);
router.use('/v1/admin/legal', legalAdminRouter);
router.use('/webhooks/session', sessionWebhookRoutes);
router.use('/webhooks/operational', operationalWebhookRoutes);
router.get('/ping', (_req, res) => res.send('SYNTAX STORIES'));

export default router;
