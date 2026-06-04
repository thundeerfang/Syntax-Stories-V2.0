import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/index.js';
import {
  getAchievements,
  getAchievementsSummary,
  getAchievementsLeaderboard,
} from '../achievements/achievement.controller.js';

const router = Router();

router.get('/', verifyToken, getAchievements);
router.get('/summary', verifyToken, getAchievementsSummary);
router.get('/leaderboard', verifyToken, getAchievementsLeaderboard);

export default router;
