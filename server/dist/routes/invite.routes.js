import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/verifyToken.js';
import { rateLimitInviteResolve } from '../middlewares/auth/rateLimitAuth.js';
import { attachReferralCookie, getInviteResolve, getInviteMe, getInviteStats, getInviteReferred, } from '../controllers/invite.controller.js';
const router = Router();
router.get('/attach', attachReferralCookie);
router.get('/resolve', rateLimitInviteResolve, getInviteResolve);
router.get('/me', verifyToken, getInviteMe);
router.get('/stats', verifyToken, getInviteStats);
router.get('/referred', verifyToken, getInviteReferred);
export default router;
//# sourceMappingURL=invite.routes.js.map