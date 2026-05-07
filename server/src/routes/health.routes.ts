import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { getLegalHealth } from '../controllers/legalHealth.controller.js';

const router = Router();
router.get('/', getHealth);
router.get('/legal', getLegalHealth);
export default router;
