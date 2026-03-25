import { Router } from 'express';
import { recordProfileView, getProfileOverview, getProfileTimeSeries } from '../controllers/analytics.controller';
import { rateLimitProfileView } from '../middlewares/analytics/rateLimitProfileView';

const router = Router();

// Record a profile view (logged-in via session or anonymous). Username is public handle.
router.post('/profile-view/:username', rateLimitProfileView, recordProfileView);

// Get aggregated overview metrics for a profile (public data).
router.get('/profile-overview/:username', getProfileOverview);

// Get per-day views time series for last 30 days.
router.get('/profile/:username/timeseries', getProfileTimeSeries);

export default router;

