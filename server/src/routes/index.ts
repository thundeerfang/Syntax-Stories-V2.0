import { Router } from 'express';
import healthRoutes from './health.routes';
import followRoutes from './follow.routes';
import companiesRoutes from './companies.routes';
import githubRoutes from './github.routes';
import analyticsRoutes from './analytics.routes';
import blogRoutes from './blog.routes';

const router = Router();
router.use('/health', healthRoutes);
router.use('/follow', followRoutes);
router.use('/companies', companiesRoutes);
router.use('/github', githubRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/blog', blogRoutes);
router.get('/ping', (_req, res) => res.send('SYNTAX STORIES'));

export default router;
