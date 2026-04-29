import { Request, Response } from 'express';
import { SessionModel } from '../models/Session';
/** Create a session and return access + refresh tokens and session. Used by OAuth callbacks so the client can refresh when access token expires. */
export declare function createSessionAndTokens(userId: string, req: Request): Promise<{
    accessToken: string;
    refreshToken: string;
    session: InstanceType<typeof SessionModel>;
}>;
export declare function sendOtp(req: Request, res: Response): Promise<void>;
export declare function signupEmail(req: Request, res: Response): Promise<void>;
export declare function verifyOtp(req: Request, res: Response): Promise<void>;
export declare function verifyTwoFactorLogin(req: Request, res: Response): Promise<void>;
export declare function refresh(req: Request, res: Response): Promise<void>;
export declare function logout(req: Request, res: Response): Promise<void>;
/** Revoke session by refresh token only (no JWT). Use when token expired and client clears state. */
export declare function revokeSessionByRefreshToken(req: Request, res: Response): Promise<void>;
export declare function me(req: Request, res: Response): Promise<void>;
export declare function setupTwoFactor(req: Request, res: Response): Promise<void>;
export declare function enableTwoFactor(req: Request, res: Response): Promise<void>;
export declare function disableTwoFactor(req: Request, res: Response): Promise<void>;
export declare function listSessions(req: Request, res: Response): Promise<void>;
export declare function revokeSession(req: Request, res: Response): Promise<void>;
export declare function logoutAll(req: Request, res: Response): Promise<void>;
export declare function logoutOthers(req: Request, res: Response): Promise<void>;
export declare function listSecurityEvents(req: Request, res: Response): Promise<void>;
export declare function updateProfile(req: Request, res: Response): Promise<void>;
/** Parse CV/Resume PDF and return extracted profile data + missing fields. Does not update user. */
export declare function parseCv(req: Request, res: Response): Promise<void>;
export declare function createIntent(req: Request, res: Response): Promise<void>;
export declare function deleteAccount(req: Request, res: Response): Promise<void>;
export declare function linkRequest(req: Request, res: Response): Promise<void>;
export declare function initEmailChange(req: Request, res: Response): Promise<void>;
export declare function verifyEmailChange(req: Request, res: Response): Promise<void>;
/** Cancel pending email change: invalidate codes so verify will fail with "expired or invalid". */
export declare function cancelEmailChange(req: Request, res: Response): Promise<void>;
export declare function disconnectProvider(req: Request, res: Response): Promise<void>;
export declare function initQrLogin(_req: Request, res: Response): Promise<void>;
export declare function approveQrLogin(req: Request, res: Response): Promise<void>;
export declare function pollQrLogin(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map