import { Router } from 'express';

const router = Router();

/**
 * Public operational heartbeat for frontend status (footer / dashboards).
 * No auth — same contract as GET /api/health but namespaced under webhooks for monitoring hooks.
 */
router.get('/ping', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'syntax-stories-api',
    t: new Date().toISOString(),
  });
});

export default router;
