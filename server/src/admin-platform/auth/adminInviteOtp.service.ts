import crypto from "node:crypto";
import { getRedis } from "../../config/redis.js";
import {
  generateEmailOtpDigits,
  hashEmailOtp,
  verifyEmailOtpHash,
} from "../../services/emailOtp.service.js";
import {
  isAuthEmailConfigured,
  sendAuthEmail,
  getEmailSendErrorMessage,
} from "../../infrastructure/mail/sendAuthEmail.js";
import { enqueueAuthEmailBullmq } from "../queues/authEmailBullmq.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { UserModel } from "../../models/User.js";
import { AdminUserModel } from "../rbac/models/AdminUser.js";
import {
  ADMIN_INVITE_OTP_TTL_SEC,
  ADMIN_INVITE_VERIFIED_TOKEN_TTL_SEC,
} from "../../variable/constants.js";
export function isAdminOperatorPasswordValid(password: string): boolean {
  return (
    password.length > 10 && /[a-z]/.test(password) && /[A-Z]/.test(password)
  );
}
export async function assertInviteEmailAvailable(
  emailNorm: string,
): Promise<string | null> {
  const dupUser = await UserModel.findOne({ email: emailNorm })
    .select("_id")
    .lean();
  if (dupUser) return "A platform account with this email already exists.";
  const dupAdmin = await AdminUserModel.findOne({ email: emailNorm })
    .select("_id")
    .lean();
  if (dupAdmin) return "An admin account with this email already exists.";
  return null;
}
export async function sendAdminInviteOtp(emailNorm: string): Promise<
  | {
      ok: true;
      otpVersion: number;
      expiresInSeconds: number;
    }
  | {
      ok: false;
      status: number;
      message: string;
    }
> {
  if (!isAuthEmailConfigured()) {
    return {
      ok: false,
      status: 503,
      message: "Email is not configured. Cannot send verification code.",
    };
  }
  const conflict = await assertInviteEmailAvailable(emailNorm);
  if (conflict) {
    return { ok: false, status: 409, message: conflict };
  }
  const redis = getRedis();
  if (!redis) {
    return {
      ok: false,
      status: 503,
      message: "Service temporarily unavailable. Try again later.",
    };
  }
  const code = generateEmailOtpDigits();
  const otpVersion = await redis.incr(
    redisKeys.adminInvite.otpVersion(emailNorm),
  );
  const payload = { h: hashEmailOtp(emailNorm, code), v: otpVersion };
  await redis.setEx(
    redisKeys.adminInvite.otp(emailNorm),
    ADMIN_INVITE_OTP_TTL_SEC,
    JSON.stringify(payload),
  );
  const ttlMin = Math.ceil(ADMIN_INVITE_OTP_TTL_SEC / 60);
  const queued = await enqueueAuthEmailBullmq({
    type: "admin_invite_otp",
    email: emailNorm,
    code,
    ttlMin,
  });
  if (!queued) {
    try {
      await sendAuthEmail({
        to: emailNorm,
        subject: "Verify admin operator email — Syntax Stories",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
            <h2 style="color: #5f4fe6;">Admin operator verification</h2>
            <p>Use this code to verify the work email for a new dashboard operator:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
            <p style="font-size: 14px; color: #666;">Expires in ${ttlMin} minute(s).</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[sendAdminInviteOtp]", err);
      return {
        ok: false,
        status: 500,
        message: getEmailSendErrorMessage(err),
      };
    }
  }
  return {
    ok: true,
    otpVersion,
    expiresInSeconds: ADMIN_INVITE_OTP_TTL_SEC,
  };
}
export async function verifyAdminInviteOtp(
  emailNorm: string,
  code: string,
  otpVersion?: number,
): Promise<
  | {
      ok: true;
      emailVerificationToken: string;
      expiresInSeconds: number;
    }
  | {
      ok: false;
      status: number;
      message: string;
    }
> {
  const redis = getRedis();
  if (!redis) {
    return {
      ok: false,
      status: 503,
      message: "Service temporarily unavailable.",
    };
  }
  const raw = await redis.get(redisKeys.adminInvite.otp(emailNorm));
  if (!raw) {
    return { ok: false, status: 401, message: "Invalid or expired code." };
  }
  let stored: {
    h: string;
    v?: number;
  };
  try {
    stored = JSON.parse(raw) as {
      h: string;
      v?: number;
    };
  } catch {
    return { ok: false, status: 401, message: "Invalid or expired code." };
  }
  if (otpVersion != null && stored.v != null && stored.v !== otpVersion) {
    return {
      ok: false,
      status: 401,
      message: "That code is no longer valid. Request a new one.",
    };
  }
  const otpCode = String(code).replaceAll(/\D/g, "").slice(0, 6);
  if (
    otpCode.length !== 6 ||
    !verifyEmailOtpHash(stored.h, emailNorm, otpCode)
  ) {
    return { ok: false, status: 401, message: "Invalid or expired code." };
  }
  await redis.del(redisKeys.adminInvite.otp(emailNorm));
  const emailVerificationToken = crypto.randomBytes(24).toString("hex");
  await redis.setEx(
    redisKeys.adminInvite.verified(emailVerificationToken),
    ADMIN_INVITE_VERIFIED_TOKEN_TTL_SEC,
    emailNorm,
  );
  return {
    ok: true,
    emailVerificationToken,
    expiresInSeconds: ADMIN_INVITE_VERIFIED_TOKEN_TTL_SEC,
  };
}
export async function consumeEmailVerificationToken(
  token: string,
  emailNorm: string,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis || !token?.trim()) return false;
  const key = redisKeys.adminInvite.verified(token.trim());
  const stored = await redis.get(key);
  if (!stored || stored !== emailNorm) return false;
  await redis.del(key);
  return true;
}
