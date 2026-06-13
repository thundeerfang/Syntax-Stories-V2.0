import { Router } from 'express';
import { postReplayWebhook } from '../controllers/internalBilling.controller.js';

const router = Router();
router.post('/replay-webhook', postReplayWebhook);

export default router;
