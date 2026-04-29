import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { type IUser } from '../models/User.js';
/**
 * After email OTP is verified: 2FA branch, or issue JWT + session JSON (same shape as verifyOtp).
 */
export declare function respondWithSessionAfterEmailAuth(req: Request, res: Response, user: HydratedDocument<IUser>, isNewUser: boolean): Promise<void>;
//# sourceMappingURL=authLogin.service.d.ts.map