import { Router } from 'express';
import { getPublicProfile, getFollowCounts, getFollowers, getFollowing, followUser, unfollowUser, checkFollowing } from '../controllers/follow.controller';
import { verifyToken } from '../middlewares/auth';
import { rateLimitFollowWrite } from '../middlewares/follow/rateLimitFollow';

const router = Router();

router.get('/profile/:username', getPublicProfile);
router.get('/counts/:username', getFollowCounts);
router.get('/followers/:username', getFollowers);
router.get('/following/:username', getFollowing);
router.get('/check/:username', verifyToken, checkFollowing);
router.post('/:username', verifyToken, rateLimitFollowWrite, followUser);
router.delete('/:username', verifyToken, rateLimitFollowWrite, unfollowUser);

export default router;
