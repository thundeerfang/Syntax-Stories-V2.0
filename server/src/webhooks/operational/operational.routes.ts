import { Router } from "express";
import { recordPlatformHealthCheck } from "../../services/platform/platformUptime.service.js";
const router = Router();
router.get("/ping", (_req, res) => {
  void recordPlatformHealthCheck(true);
  res.status(200).json({
    ok: true,
    service: "syntax-stories-api",
    t: new Date().toISOString(),
  });
});
export default router;
