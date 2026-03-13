import { Router } from 'express';
import { verifyToken } from '../middlewares/auth';
import { createPost, listMyPosts } from '../controllers/blog.controller';

const router = Router();

router.post('/', verifyToken, createPost);
router.get('/', verifyToken, listMyPosts);

export default router;
