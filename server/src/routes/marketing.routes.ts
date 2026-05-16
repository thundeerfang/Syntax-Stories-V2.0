import { Router } from 'express';
import { getAboutMarketingPage } from '../controllers/marketing.controller.js';

const router = Router();

router.get('/about', getAboutMarketingPage);

export default router;
