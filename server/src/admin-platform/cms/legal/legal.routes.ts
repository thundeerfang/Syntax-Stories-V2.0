import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '../../../middlewares/auth/index.js';
import { cmsAdminGate } from '../../rbac/middleware/cmsAdminGate.js';
import {
  adminBootstrapPolicies,
  adminGetPolicy,
  adminDeleteRevision,
  adminGetRevision,
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

/** Admin CMS — editors poll list/revision endpoints frequently. */
const adminWrite = rateLimit({
  windowMs: 60_000,
  max: 200,
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
legalAdminRouter.use(...cmsAdminGate('legal:manage'), adminWrite);
legalAdminRouter.get('/policies', adminListPolicies);
legalAdminRouter.post('/policies/bootstrap', adminBootstrapPolicies);
legalAdminRouter.get('/policies/:policyId/revisions/:revisionId', adminGetRevision);
legalAdminRouter.delete('/policies/:policyId/revisions/:revisionId', adminDeleteRevision);
legalAdminRouter.get('/policies/:policyId/revisions', adminListRevisions);
legalAdminRouter.get('/policies/:policyId', adminGetPolicy);
legalAdminRouter.patch('/policies/:policyId', adminPatchPolicy);
