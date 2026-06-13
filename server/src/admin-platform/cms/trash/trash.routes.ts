import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../../../config/rateLimits.js';
import { cmsAdminGate } from '../../rbac/middleware/cmsAdminGate.js';
import { getTrash, postRestore } from './trash.controller.js';

const trashRead = rateLimit({
  ...RATE_LIMITS.trashRead,
  standardHeaders: true,
  legacyHeaders: false,
});

export const trashAdminRouter = Router();
trashAdminRouter.use(...cmsAdminGate('trash:manage'), trashRead);
trashAdminRouter.get('/', getTrash);
trashAdminRouter.post('/restore', postRestore);
