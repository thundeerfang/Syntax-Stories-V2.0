import type { Request } from 'express';
import { SessionModel } from '../models/Session.js';
/** Session duration and sliding window (matches prior auth.controller / authLogin behavior). */
export declare const SESSION_DURATION_MS: number;
export declare function generateRefreshToken(): string;
export declare function createSession(userId: string, req: Request, refreshToken: string): Promise<InstanceType<typeof SessionModel>>;
/** Used by OAuth callbacks and any flow that needs JWT + refresh + persisted session. */
export declare function createSessionAndTokens(userId: string, req: Request): Promise<{
    accessToken: string;
    refreshToken: string;
    session: InstanceType<typeof SessionModel>;
}>;
//# sourceMappingURL=session.service.d.ts.map