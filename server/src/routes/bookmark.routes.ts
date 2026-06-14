import { Router } from "express";
import { verifyToken } from "../middlewares/auth/index.js";
import {
  createBookmarkGroup,
  listBookmarkGroups,
  listBookmarkedPosts,
  patchBookmarkGroup,
  removeBookmarkGroup,
} from "../controllers/bookmarkLibrary.controller.js";
const router = Router();
router.get("/groups", verifyToken, listBookmarkGroups);
router.post("/groups", verifyToken, createBookmarkGroup);
router.patch("/groups/:groupId", verifyToken, patchBookmarkGroup);
router.delete("/groups/:groupId", verifyToken, removeBookmarkGroup);
router.get("/posts", verifyToken, listBookmarkedPosts);
export default router;
