import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/index.js';
import {
  listNotifications,
  markAllNotificationsRead,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', verifyToken, listNotifications);
router.post('/read-all', verifyToken, markAllNotificationsRead);

export default router;
