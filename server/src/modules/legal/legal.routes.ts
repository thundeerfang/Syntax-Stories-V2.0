import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '../../middlewares/auth/index.js';
import { requireStaff } from '../help/requireStaff.middleware.js';
import {
  adminGetPolicy,
  adminListPolicies,
  adminListRevisions,
  adminPatchPolicy,
  getMeLegalStatus,
  getPublishedPolicyByKind,
  listMyDeletionRequests,
  postAccept,
  postAcceptIntent,
  postDataDeletionRequest,
} from './legal.handlers.js';

const publicRead = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const userWrite = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const legalPublicRouter = Router();
legalPublicRouter.get('/policies/:kind', publicRead, getPublishedPolicyByKind);

export const legalUserRouter = Router();
legalUserRouter.use(verifyToken, userWrite);
legalUserRouter.post('/accept-intent', postAcceptIntent);
legalUserRouter.post('/accept', postAccept);
legalUserRouter.get('/me/status', getMeLegalStatus);
legalUserRouter.post('/data-deletion-requests', postDataDeletionRequest);
legalUserRouter.get('/data-deletion-requests', listMyDeletionRequests);

export const legalAdminRouter = Router();
legalAdminRouter.use(verifyToken, requireStaff('editor', 'admin'), userWrite);
legalAdminRouter.get('/policies', adminListPolicies);
legalAdminRouter.get('/policies/:policyId', adminGetPolicy);
legalAdminRouter.get('/policies/:policyId/revisions', adminListRevisions);
legalAdminRouter.patch('/policies/:policyId', adminPatchPolicy);
