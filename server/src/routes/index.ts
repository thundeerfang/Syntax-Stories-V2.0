import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();
router.use('/health', healthRoutes);
router.get('/ping', (_req, res) => res.send('SYNTAX STORIES'));

export default router;
