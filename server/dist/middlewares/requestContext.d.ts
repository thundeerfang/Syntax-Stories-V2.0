import type { Request, Response, NextFunction } from 'express';
declare module 'express-serve-static-core' {
    interface Request {
        requestId?: string;
    }
}
/**
 * Propagates `X-Request-Id` (client or generated) for log correlation.
 */
export declare function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=requestContext.d.ts.map