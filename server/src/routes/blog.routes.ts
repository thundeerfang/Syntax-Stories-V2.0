import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/index.js';
import { optionalVerifyToken } from '../middlewares/auth/optionalVerifyToken.js';
import { rateLimitBlogRespectWrite } from '../middlewares/blog/rateLimitBlogRespect.js';
import {
  commitBlogReadView,
  createPost,
  deleteMyPost,
  getBlogTaxonomy,
  getDraft,
  getMyPostById,
  getPublishedPostBySlug,
  recordBlogReadDay,
  listMyPosts,
  listPublishedFeed,
  listUserPublishedPosts,
  purgeMyPostPermanently,
  restoreMyPost,
  startBlogReadView,
  updateMyPost,
  upsertDraft,
} from '../controllers/blog.controller.js';
import { addBlogComment, listBlogComments } from '../controllers/blogComment.controller.js';
import { postBlogRespectViewerState, setBlogRespect } from '../controllers/blogRespect.controller.js';

const router = Router();

router.get('/taxonomy', getBlogTaxonomy);
router.get('/feed', optionalVerifyToken, listPublishedFeed);
router.get('/u/:username/posts', optionalVerifyToken, listUserPublishedPosts);
router.get('/p/:username/:slug/comments', listBlogComments);
router.post('/p/:username/:slug/comments', verifyToken, addBlogComment);
router.post('/p/:username/:slug/read/start', verifyToken, startBlogReadView);
router.post('/p/:username/:slug/read/commit', verifyToken, commitBlogReadView);
router.post('/p/:username/:slug/read-day', verifyToken, recordBlogReadDay);
router.post(
  '/p/:username/:slug/respect',
  verifyToken,
  rateLimitBlogRespectWrite,
  setBlogRespect
);
router.post('/respect/viewer-state', verifyToken, rateLimitBlogRespectWrite, postBlogRespectViewerState);
router.get('/p/:username/:slug', optionalVerifyToken, getPublishedPostBySlug);
router.post('/', verifyToken, createPost);
router.get('/draft', verifyToken, getDraft);
router.put('/draft', verifyToken, upsertDraft);
router.put('/post/:postId/restore', verifyToken, restoreMyPost);
router.delete('/post/:postId/permanent', verifyToken, purgeMyPostPermanently);
router.get('/post/:postId', verifyToken, getMyPostById);
router.put('/post/:postId', verifyToken, updateMyPost);
router.delete('/post/:postId', verifyToken, deleteMyPost);
router.get('/', verifyToken, listMyPosts);

export default router;
