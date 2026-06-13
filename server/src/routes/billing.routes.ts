import { Router } from 'express';
import {
  getPlans,
  getSubscription,
  getTransactions,
  postCheckoutSession,
  postPortalSession,
  postVerifyCheckout,
} from '../controllers/billing.controller.js';
import { verifyToken } from '../middlewares/auth/index.js';
import {
  rateLimitCreateCheckout,
  rateLimitVerifyCheckout,
} from '../middlewares/billing/rateLimitBilling.js';

const router = Router();

router.get('/plans', getPlans);
router.post('/checkout-session', verifyToken, rateLimitCreateCheckout, postCheckoutSession);
router.post('/verify-checkout', verifyToken, rateLimitVerifyCheckout, postVerifyCheckout);
router.post('/portal-session', verifyToken, postPortalSession);
router.get('/subscription', verifyToken, getSubscription);
router.get('/transactions', verifyToken, getTransactions);

export default router;
