import { Router } from "express";
import { verifyToken } from "../middlewares/auth/index.js";
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  patchNotificationPreferences,
} from "../controllers/notifications.controller.js";
import { streamNotifications } from "../controllers/notificationsStream.controller.js";
const router = Router();
router.get("/", verifyToken, listNotifications);
router.get("/stream", verifyToken, streamNotifications);
router.get("/preferences", verifyToken, getNotificationPreferences);
router.patch("/preferences", verifyToken, patchNotificationPreferences);
router.post("/read-all", verifyToken, markAllNotificationsReadHandler);
router.post("/:id/read", verifyToken, markNotificationReadHandler);
export default router;
