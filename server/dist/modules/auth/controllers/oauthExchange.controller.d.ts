import type { Request, Response } from 'express';
/**
 * `POST /auth/oauth/exchange` — swap one-time redirect code for tokens (no secrets in browser history/referrer).
 */
export declare function exchangeOAuthCode(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=oauthExchange.controller.d.ts.map