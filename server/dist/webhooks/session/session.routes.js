import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth/index.js';
import { sessionPing } from './sessionPing.controller.js';
const router = Router();
router.get('/ping', verifyToken, sessionPing);
export default router;
//# sourceMappingURL=session.routes.js.map