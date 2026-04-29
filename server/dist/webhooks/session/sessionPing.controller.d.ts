import { Request, Response } from 'express';
/**
 * GET /api/webhooks/session/ping
 * Lightweight authenticated check for clients to verify the access token after reload.
 * Does not issue new tokens (refresh remains on POST /auth/refresh or client refresh flow).
 */
export declare function sessionPing(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=sessionPing.controller.d.ts.map