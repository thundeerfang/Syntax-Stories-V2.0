import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '../../middlewares/auth/index.js';
import { requireStaff } from '../help/requireStaff.middleware.js';
import { getTrash, postRestore } from './trash.controller.js';

const trashRead = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const trashAdminRouter = Router();
trashAdminRouter.use(verifyToken, requireStaff('editor', 'admin'), trashRead);
trashAdminRouter.get('/', getTrash);
trashAdminRouter.post('/restore', postRestore);
