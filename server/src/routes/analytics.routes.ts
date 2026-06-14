import { Router } from "express";
import {
  recordProfileView,
  getProfileOverview,
  getProfileTimeSeries,
} from "../controllers/analytics.controller.js";
import { rateLimitProfileView } from "../middlewares/analytics/rateLimitProfileView.js";
const router = Router();
router.post("/profile-view/:username", rateLimitProfileView, recordProfileView);
router.get("/profile-overview/:username", getProfileOverview);
router.get("/profile/:username/timeseries", getProfileTimeSeries);
export default router;
