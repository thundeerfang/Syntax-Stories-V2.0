import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    _id: string;
    sessionId?: string;
}
export declare function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=verifyToken.d.ts.map