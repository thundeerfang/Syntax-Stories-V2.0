import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { getLegalHealth } from "../controllers/legalHealth.controller.js";
import { getStorageHealth } from "../controllers/healthStorage.controller.js";
const router = Router();
router.get("/", getHealth);
router.get("/legal", getLegalHealth);
router.get("/storage", getStorageHealth);
export default router;
