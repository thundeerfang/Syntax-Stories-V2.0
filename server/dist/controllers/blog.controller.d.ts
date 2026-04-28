import { Request, Response } from 'express';
/** POST /api/blog - create a new blog post (draft or published) */
export declare function createPost(req: Request, res: Response): Promise<void>;
/** PUT /api/blog/draft - upsert current user's draft (sync from local) */
export declare function upsertDraft(req: Request, res: Response): Promise<void>;
/** GET /api/blog/draft - get current user's single draft (for sync/restore) */
export declare function getDraft(req: Request, res: Response): Promise<void>;
/** GET /api/blog/feed — public: recent published posts (home / explore). */
export declare function listPublishedFeed(req: Request, res: Response): Promise<void>;
/** GET /api/blog/u/:username/posts — public: published posts by that author (profile / u-page grid). */
export declare function listUserPublishedPosts(req: Request, res: Response): Promise<void>;
/** GET /api/blog/p/:username/:slug — public: one published post by author username + slug. */
export declare function getPublishedPostBySlug(req: Request, res: Response): Promise<void>;
/** GET /api/blog - list current user's posts (for now: my posts only) */
export declare function listMyPosts(req: Request, res: Response): Promise<void>;
/** GET /api/blog/post/:postId — owner-only: load one post for editing. */
export declare function getMyPostById(req: Request, res: Response): Promise<void>;
/** PUT /api/blog/post/:postId — owner-only: update draft or published post. */
export declare function updateMyPost(req: Request, res: Response): Promise<void>;
/** PUT /api/blog/post/:postId/restore — owner-only: undelete within retention window; becomes published. */
export declare function restoreMyPost(req: Request, res: Response): Promise<void>;
/** DELETE /api/blog/post/:postId/permanent — owner-only: hard-delete a soft-deleted post. */
export declare function purgeMyPostPermanently(req: Request, res: Response): Promise<void>;
/** DELETE /api/blog/post/:postId — owner-only. */
export declare function deleteMyPost(req: Request, res: Response): Promise<void>;
/** GET /api/blog/taxonomy — public: curated categories/tags plus published post counts. */
export declare function getBlogTaxonomy(_req: Request, res: Response): Promise<void>;
//# sourceMappingURL=blog.controller.d.ts.map