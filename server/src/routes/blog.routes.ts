import { Router } from "express";
import { verifyToken } from "../middlewares/auth/index.js";
import { optionalVerifyToken } from "../middlewares/auth/optionalVerifyToken.js";
import { rateLimitBlogEngagementWrite } from "../middlewares/blog/rateLimitBlogEngagement.js";
import { rateLimitBlogRespectWrite } from "../middlewares/blog/rateLimitBlogRespect.js";
import {
  commitBlogReadView,
  createPost,
  deleteMyPost,
  getBlogTaxonomy,
  getBlogTagsExplore,
  listBlogTagsPaginated,
  listBlogTaxonomyCategories,
  getDraft,
  getMyPostById,
  getPublishedPostBySlug,
  listPublishedFeed,
  listMyPosts,
  listUserPublishedPosts,
  purgeMyPostPermanently,
  recordBlogReadDay,
  restoreMyPost,
  startBlogReadView,
  updateMyPost,
  upsertDraft,
} from "../controllers/blog.controller.js";
import {
  listUserRepliedPosts,
  listUserRepostedPosts,
} from "../controllers/profileActivity.controller.js";
import {
  addBlogComment,
  deleteBlogComment,
  listBlogComments,
  toggleBlogCommentLike,
  updateBlogComment,
} from "../controllers/blogComment.controller.js";
import {
  postBlogEngagementViewerState,
  setBlogBookmark,
  setBlogRepost,
} from "../controllers/blogEngagement.controller.js";
import {
  postBlogRespectViewerState,
  setBlogRespect,
} from "../controllers/blogRespect.controller.js";
import { streamBlogPostStats } from "../controllers/blogStatsStream.controller.js";
import {
  followCategory,
  getCategoryMembersPreview,
  listMyFollowedCategories,
  syncMyFollowedCategories,
  unfollowCategory,
} from "../controllers/blogCategoryFollow.controller.js";
const router = Router();
router.get("/taxonomy", getBlogTaxonomy);
router.get("/taxonomy/categories", listBlogTaxonomyCategories);
router.get("/categories/members-preview", getCategoryMembersPreview);
router.get("/categories/following", verifyToken, listMyFollowedCategories);
router.post(
  "/categories/following/sync",
  verifyToken,
  syncMyFollowedCategories,
);
router.post("/categories/:slug/follow", verifyToken, followCategory);
router.delete("/categories/:slug/follow", verifyToken, unfollowCategory);
router.get("/tags/explore", getBlogTagsExplore);
router.get("/tags/list", listBlogTagsPaginated);
router.get("/feed", optionalVerifyToken, listPublishedFeed);
router.get("/u/:username/posts", optionalVerifyToken, listUserPublishedPosts);
router.get("/u/:username/reposts", optionalVerifyToken, listUserRepostedPosts);
router.get("/u/:username/replies", optionalVerifyToken, listUserRepliedPosts);
router.get("/p/:username/:slug/stats/stream", streamBlogPostStats);
router.get(
  "/p/:username/:slug/comments",
  optionalVerifyToken,
  listBlogComments,
);
router.patch(
  "/p/:username/:slug/comments/:commentId",
  verifyToken,
  updateBlogComment,
);
router.delete(
  "/p/:username/:slug/comments/:commentId",
  verifyToken,
  deleteBlogComment,
);
router.post(
  "/p/:username/:slug/comments/:commentId/like",
  verifyToken,
  toggleBlogCommentLike,
);
router.post("/p/:username/:slug/comments", verifyToken, addBlogComment);
router.post("/p/:username/:slug/read/start", verifyToken, startBlogReadView);
router.post("/p/:username/:slug/read/commit", verifyToken, commitBlogReadView);
router.post("/p/:username/:slug/read-day", verifyToken, recordBlogReadDay);
router.post(
  "/p/:username/:slug/respect",
  verifyToken,
  rateLimitBlogRespectWrite,
  setBlogRespect,
);
router.post(
  "/p/:username/:slug/repost",
  verifyToken,
  rateLimitBlogEngagementWrite,
  setBlogRepost,
);
router.post(
  "/p/:username/:slug/bookmark",
  verifyToken,
  rateLimitBlogEngagementWrite,
  setBlogBookmark,
);
router.post(
  "/respect/viewer-state",
  verifyToken,
  rateLimitBlogRespectWrite,
  postBlogRespectViewerState,
);
router.post(
  "/engagement/viewer-state",
  verifyToken,
  rateLimitBlogEngagementWrite,
  postBlogEngagementViewerState,
);
router.get("/p/:username/:slug", optionalVerifyToken, getPublishedPostBySlug);
router.post("/", verifyToken, createPost);
router.get("/draft", verifyToken, getDraft);
router.put("/draft", verifyToken, upsertDraft);
router.put("/post/:postId/restore", verifyToken, restoreMyPost);
router.delete("/post/:postId/permanent", verifyToken, purgeMyPostPermanently);
router.get("/post/:postId", verifyToken, getMyPostById);
router.put("/post/:postId", verifyToken, updateMyPost);
router.delete("/post/:postId", verifyToken, deleteMyPost);
router.get("/", verifyToken, listMyPosts);
export default router;
