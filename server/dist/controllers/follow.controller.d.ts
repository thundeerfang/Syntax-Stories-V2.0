import { Request, Response } from 'express';
export declare function getPublicProfile(req: Request, res: Response): Promise<void>;
export declare function getFollowCounts(req: Request, res: Response): Promise<void>;
export declare function getFollowers(req: Request, res: Response): Promise<void>;
export declare function getFollowing(req: Request, res: Response): Promise<void>;
export declare function followUser(req: Request, res: Response): Promise<void>;
export declare function unfollowUser(req: Request, res: Response): Promise<void>;
/** GET /api/follow/search?q=... - search users by username for mentions (public) */
export declare function searchUsers(req: Request, res: Response): Promise<void>;
/** GET /api/follow/check/:username - returns { following: boolean } for current user */
export declare function checkFollowing(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=follow.controller.d.ts.map