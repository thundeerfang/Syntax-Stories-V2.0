import { Router } from "express";
import { getPlatformStats } from "../controllers/platformStats.controller.js";
const router = Router();
router.get("/stats", getPlatformStats);
export default router;
