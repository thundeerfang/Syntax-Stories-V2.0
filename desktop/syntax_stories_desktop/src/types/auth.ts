/**
 * Aligned with `webapp/src/contracts/authApi.ts` / server auth JSON routes.
 */

export interface SendOtpPayload {
  email: string;
  altcha?: string;
}

export interface SignUpEmailPayload {
  fullName: string;
  email: string;
  altcha?: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
  otpVersion?: number;
  referralCode?: string;
}

export interface SendOtpResponse {
  message: string;
  success: boolean;
  otpVersion?: number;
  expiresInSeconds?: number;
}

export interface VerifyOtpResponse {
  message: string;
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  isNewUser?: boolean;
  email?: string;
  sessionId?: string;
  user?: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    profileImg?: string;
  };
}

export interface VerifyTwoFactorLoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: string;
  user: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    profileImg?: string;
  };
}

export interface RefreshTokenResponseBody {
  success: boolean;
  accessToken: string;
  expiresIn?: string;
}

export interface AccountUser {
  _id: string;
  email: string;
  fullName?: string;
  username?: string;
  profileImg?: string;
}

export interface MeResponse {
  success: boolean;
  data?: { user: AccountUser };
  message?: string;
}
