import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { cmsAdminGate } from '../../rbac/middleware/cmsAdminGate.js';
import { getTrash, postRestore } from './trash.controller.js';

const trashRead = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const trashAdminRouter = Router();
trashAdminRouter.use(...cmsAdminGate('trash:manage'), trashRead);
trashAdminRouter.get('/', getTrash);
trashAdminRouter.post('/restore', postRestore);
