import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/index.js';
import { rateLimitFeedback } from '../middlewares/auth/rateLimitAuth.js';
import {
  getFeedbackQuota,
  listFeedbackCategories,
  submitFeedback,
} from '../controllers/feedback.controller.js';
import { createImageMasterMulter, runImageMasterUpload } from '../services/image/imageMasterMulter.js';

const router = Router();

const uploadFeedbackMw = createImageMasterMulter('feedback');

router.get('/categories', listFeedbackCategories);
router.get('/quota', verifyToken, getFeedbackQuota);
router.post(
  '/',
  rateLimitFeedback,
  verifyToken,
  runImageMasterUpload(uploadFeedbackMw, 'attachment', 'feedback'),
  submitFeedback
);

export default router;
