import type { Request, Response } from 'express';
/** GET /api/invites/attach?code=&next= — Set-Cookie signed ss_ref, redirect to frontend. */
export declare function attachReferralCookie(req: Request, res: Response): Promise<void>;
/** GET /api/invites/resolve?code= */
export declare function getInviteResolve(req: Request, res: Response): Promise<void>;
/** GET /api/invites/me */
export declare function getInviteMe(req: Request, res: Response): Promise<void>;
/** GET /api/invites/stats */
export declare function getInviteStats(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=invite.controller.d.ts.map