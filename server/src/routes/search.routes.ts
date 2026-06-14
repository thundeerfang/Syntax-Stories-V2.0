import { Router } from "express";
import { getUnifiedSearch } from "../controllers/search.controller.js";
const router = Router();
router.get("/", getUnifiedSearch);
export default router;
