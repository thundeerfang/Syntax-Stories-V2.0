import { Router } from 'express';
import healthRoutes from './health.routes.js';
import followRoutes from './follow.routes.js';
import companiesRoutes from './companies.routes.js';
import githubRoutes from './github.routes.js';
import analyticsRoutes from './analytics.routes.js';
import blogRoutes from './blog.routes.js';
import sessionWebhookRoutes from '../webhooks/session/session.routes.js';
const router = Router();
router.use('/health', healthRoutes);
router.use('/follow', followRoutes);
router.use('/companies', companiesRoutes);
router.use('/github', githubRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/blog', blogRoutes);
router.use('/webhooks/session', sessionWebhookRoutes);
router.get('/ping', (_req, res) => res.send('SYNTAX STORIES'));
export default router;
//# sourceMappingURL=index.js.map