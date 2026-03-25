import { Router } from 'express';
import { verifyToken } from '../middlewares/auth';
import { createPost, getDraft, listMyPosts, upsertDraft } from '../controllers/blog.controller';

const router = Router();

router.post('/', verifyToken, createPost);
router.get('/draft', verifyToken, getDraft);
router.put('/draft', verifyToken, upsertDraft);
router.get('/', verifyToken, listMyPosts);

export default router;
