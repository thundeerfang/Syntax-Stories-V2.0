import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { type IUser } from '../models/User.js';
type EmailAuthOpts = {
    /** When set from staff password login, audit + app events use this source; 2FA is skipped. */
    loginSource?: 'otp' | 'staff_password';
};
/**
 * After email OTP is verified: 2FA branch, or issue JWT + session JSON (same shape as verifyOtp).
 */
export declare function respondWithSessionAfterEmailAuth(req: Request, res: Response, user: HydratedDocument<IUser>, isNewUser: boolean, opts?: EmailAuthOpts): Promise<void>;
export {};
//# sourceMappingURL=authLogin.service.d.ts.map