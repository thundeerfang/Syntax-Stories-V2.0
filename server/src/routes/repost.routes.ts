import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/index.js';
import { listRepostedPosts } from '../controllers/repostLibrary.controller.js';

const router = Router();

router.get('/posts', verifyToken, listRepostedPosts);

export default router;
