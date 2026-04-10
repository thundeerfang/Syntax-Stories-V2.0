import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/index.js';
import {
  createPost,
  getDraft,
  getPublishedPostBySlug,
  listMyPosts,
  listPublishedFeed,
  upsertDraft,
} from '../controllers/blog.controller.js';

const router = Router();

router.get('/feed', listPublishedFeed);
router.get('/p/:username/:slug', getPublishedPostBySlug);
router.post('/', verifyToken, createPost);
router.get('/draft', verifyToken, getDraft);
router.put('/draft', verifyToken, upsertDraft);
router.get('/', verifyToken, listMyPosts);

export default router;
