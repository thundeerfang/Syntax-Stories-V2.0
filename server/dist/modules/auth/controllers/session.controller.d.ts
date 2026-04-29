import type { Request, Response } from 'express';
export declare function refresh(req: Request, res: Response): Promise<void>;
export declare function logout(req: Request, res: Response): Promise<void>;
/** Revoke session by refresh token only (no JWT). Use when token expired and client clears state. */
export declare function revokeSessionByRefreshToken(req: Request, res: Response): Promise<void>;
export declare function listSessions(req: Request, res: Response): Promise<void>;
export declare function revokeSession(req: Request, res: Response): Promise<void>;
export declare function logoutAll(req: Request, res: Response): Promise<void>;
export declare function logoutOthers(req: Request, res: Response): Promise<void>;
export declare function listSecurityEvents(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=session.controller.d.ts.map