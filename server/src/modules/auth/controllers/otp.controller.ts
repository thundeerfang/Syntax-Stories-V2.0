import { Request, Response } from "express";
import { UserModel } from "../../../models/User.js";
import { newRandomDiceBearAvatarSvgUrl } from "../../../utils/diceBearAvatarUrl.js";
import { SubscriptionModel } from "../../../models/Subscription.js";
import { authConfig } from "../../../config/auth.config.js";
import { getRedis } from "../../../config/redis.js";
import { env } from "../../../config/env.js";
import { writeAuditLog } from "../../../shared/audit/auditLog.js";
import { AuditAction } from "../../../shared/audit/events.js";
import {
  sendAuthEmail,
  isAuthEmailConfigured,
  getEmailSendErrorMessage,
  isMailSendError,
} from "../../../infrastructure/mail/sendAuthEmail.js";
import { buildOtpEmail } from "../../../infrastructure/mail/emailTemplates.js";
import { bumpOtpMetric } from "../../../shared/metrics/otpMetrics.js";
import { createChallenge } from "altcha-lib";
import { respondWithSessionAfterEmailAuth } from "../../../services/authLogin.service.js";
import {
  resolveReferralInput,
  applyReferralOnNewUser,
} from "../../../services/referral.service.js";
import {
  generateEmailOtpDigits,
  getStoredLoginOtp,
  getStoredSignupOtp,
  deleteEmailOtp,
  invalidateOppositeEmailOtp,
  registerEmailOtpSendOrReject,
  storeEmailOtpLogin,
  storeEmailOtpSignup,
  verifyEmailOtpHash,
  assertOtpMinResendOrReject,
  markOtpResendGate,
  isOtpVersionMismatch,
  type EmailOtpPurpose,
  type StoredLoginOtp,
  type StoredSignupOtp,
} from "../../../services/emailOtp.service.js";
import { redisKeys } from "../../../shared/redis/keys.js";
import { logSecurityEvent } from "../securityEventLog.js";
import { recordSignupLegalAcceptances } from "../../../admin-platform/cms/legal/recordLegalAcceptances.js";
import { AUTH_TTL } from "../../../config/auth.ttls.js";
import { DEFAULT_PROFILE_BIO } from "../../../utils/profileBio.js";
function isPlayReviewerEmail(normalizedEmail: string): boolean {
  return (
    env.PLAY_REVIEWER_EMAIL.length > 0 &&
    env.PLAY_REVIEWER_OTP.length === 6 &&
    normalizedEmail === env.PLAY_REVIEWER_EMAIL
  );
}
function isPlayReviewerOtp(normalizedEmail: string, otpCode: string): boolean {
  return (
    isPlayReviewerEmail(normalizedEmail) && otpCode === env.PLAY_REVIEWER_OTP
  );
}
function otpEmailSendFailureMessage(
  err: unknown,
  redisUnavailableMessage: string,
): string {
  if (err instanceof Error && err.message === "Redis required for OTP") {
    return redisUnavailableMessage;
  }
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? (
          err as {
            code?: string;
          }
        ).code
      : undefined;
  if (code === "EAUTH") {
    return getEmailSendErrorMessage(err);
  }
  if (isMailSendError(err) && err.kind === "transient") {
    return "Email delivery is temporarily unavailable. Try again shortly.";
  }
  return "Internal Server Error 💀";
}
export async function getAltchaChallenge(
  _req: Request,
  res: Response,
): Promise<void> {
  const key = env.ALTCHA_HMAC_KEY?.trim() || process.env.JWT_SECRET?.trim();
  if (!key) {
    res.status(503).json({
      success: false,
      message:
        "ALTCHA challenge unavailable. Set ALTCHA_HMAC_KEY or JWT_SECRET.",
    });
    return;
  }
  try {
    const challenge = await createChallenge({
      hmacKey: key,
      maxNumber: 1000000,
    });
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(challenge);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ success: false, message: "Failed to create challenge" });
  }
}
export async function sendOtp(req: Request, res: Response): Promise<void> {
  try {
    if (!isAuthEmailConfigured()) {
      res.status(503).json({
        message: "Email is not configured. Cannot send login code.",
        success: false,
      });
      return;
    }
    const { email } = req.body as {
      email: string;
    };
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (!existing) {
      if (isPlayReviewerEmail(normalizedEmail)) {
        res.setHeader(
          "X-OTP-Expires-In-Seconds",
          String(authConfig.OTP_LOGIN_TTL_SECONDS),
        );
        res.status(200).json({
          message: "Reviewer verification code ready.",
          success: true,
          otpVersion: 0,
          expiresInSeconds: authConfig.OTP_LOGIN_TTL_SECONDS,
        });
        return;
      }
      bumpOtpMetric("otp_send_rejected_total");
      res.status(404).json({
        message: "No account found with this email. Please sign up first.",
        success: false,
      });
      return;
    }
    const canResend = await assertOtpMinResendOrReject(
      "login",
      normalizedEmail,
      res,
    );
    if (!canResend) {
      bumpOtpMetric("otp_send_rejected_total");
      return;
    }
    const allowed = await registerEmailOtpSendOrReject(normalizedEmail, res);
    if (!allowed) {
      bumpOtpMetric("otp_send_rejected_total");
      return;
    }
    await invalidateOppositeEmailOtp("login", normalizedEmail);
    const code = generateEmailOtpDigits();
    const otpVersion = await storeEmailOtpLogin(normalizedEmail, code);
    const ttlMin = Math.ceil(authConfig.OTP_LOGIN_TTL_SECONDS / 60);
    await sendAuthEmail({
      to: normalizedEmail,
      subject: "Your Syntax Stories login code",
      html: buildOtpEmail({
        title: "Your Code Is Ready",
        intro:
          "Use this one-time code to continue signing in to Syntax Stories.",
        codeLabel: "Login Code",
        code,
        ttlMin,
        notice: "This code expires in",
        footerNote:
          "Syntax Stories will never ask you to share this code in chat, comments, or support messages.",
      }),
    });
    await markOtpResendGate("login", normalizedEmail);
    bumpOtpMetric("otp_send_total");
    void writeAuditLog(req, AuditAction.OTP_SENT, {
      metadata: { channel: "email", purpose: "login", email: normalizedEmail },
    });
    res.setHeader(
      "X-OTP-Expires-In-Seconds",
      String(authConfig.OTP_LOGIN_TTL_SECONDS),
    );
    res.status(200).json({
      message: "Verification code sent to your email 📧",
      success: true,
      otpVersion,
      expiresInSeconds: authConfig.OTP_LOGIN_TTL_SECONDS,
    });
  } catch (err) {
    console.error(err);
    const message = otpEmailSendFailureMessage(
      err,
      "Service temporarily unavailable. Try again later.",
    );
    const redisDown =
      err instanceof Error && err.message === "Redis required for OTP";
    res.status(500).json({
      message,
      success: false,
      ...(redisDown ? { code: "REDIS_UNAVAILABLE" as const } : {}),
    });
  }
}
export async function signupEmail(req: Request, res: Response): Promise<void> {
  try {
    if (!isAuthEmailConfigured()) {
      res.status(503).json({
        message: "Email is not configured. Cannot send verification code.",
        success: false,
      });
      return;
    }
    const { fullName, email } = req.body as {
      fullName: string;
      email: string;
    };
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFullName = fullName?.trim() || "User";
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      bumpOtpMetric("otp_send_rejected_total");
      res.status(409).json({
        message:
          "An account with this email already exists. Sign in with email instead.",
        success: false,
      });
      return;
    }
    const canResend = await assertOtpMinResendOrReject(
      "signup",
      normalizedEmail,
      res,
    );
    if (!canResend) {
      bumpOtpMetric("otp_send_rejected_total");
      return;
    }
    const allowed = await registerEmailOtpSendOrReject(normalizedEmail, res);
    if (!allowed) {
      bumpOtpMetric("otp_send_rejected_total");
      return;
    }
    await invalidateOppositeEmailOtp("signup", normalizedEmail);
    const code = generateEmailOtpDigits();
    const otpVersion = await storeEmailOtpSignup(
      normalizedEmail,
      code,
      normalizedFullName,
    );
    const ttlMin = Math.ceil(authConfig.OTP_SIGNUP_TTL_SECONDS / 60);
    await sendAuthEmail({
      to: normalizedEmail,
      subject: "Verify your Syntax Stories account",
      html: buildOtpEmail({
        title: "Welcome Aboard",
        intro:
          "Welcome to Syntax Stories. Use this one-time code to verify your new account.",
        codeLabel: "Signup Code",
        code,
        ttlMin,
        notice: "This code expires in",
        footerNote: "Only enter this code inside Syntax Stories.",
      }),
    });
    await markOtpResendGate("signup", normalizedEmail);
    bumpOtpMetric("otp_send_total");
    void writeAuditLog(req, AuditAction.OTP_SENT, {
      metadata: { channel: "email", purpose: "signup", email: normalizedEmail },
    });
    res.setHeader(
      "X-OTP-Expires-In-Seconds",
      String(authConfig.OTP_SIGNUP_TTL_SECONDS),
    );
    res.status(200).json({
      message: "Verification code sent to your email 📧",
      success: true,
      otpVersion,
      expiresInSeconds: authConfig.OTP_SIGNUP_TTL_SECONDS,
    });
  } catch (err) {
    console.error(err);
    const message = otpEmailSendFailureMessage(
      err,
      "Service temporarily unavailable.",
    );
    const redisDown =
      err instanceof Error && err.message === "Redis required for OTP";
    res.status(500).json({
      message,
      success: false,
      ...(redisDown ? { code: "REDIS_UNAVAILABLE" as const } : {}),
    });
  }
}
async function failOtpVerification(
  req: Request,
  res: Response,
  redis: ReturnType<typeof getRedis>,
  normalizedEmail: string,
  reason: "invalid_otp" | "stale_otp_version",
): Promise<void> {
  bumpOtpMetric("otp_verify_fail_total");
  await logSecurityEvent(null, "login_failure", req, {
    email: normalizedEmail,
    reason,
  });
  void writeAuditLog(req, AuditAction.OTP_FAILED, {
    metadata: { email: normalizedEmail, reason },
  });
  const msg =
    reason === "stale_otp_version"
      ? "That code is no longer valid. Use the code from your latest email or request a new one."
      : "Invalid or expired code. Use Resend code or go back to request a new one.";
  const failCode =
    reason === "stale_otp_version" ? "OTP_STALE_VERSION" : "OTP_INVALID";
  if (!redis) {
    res.status(401).json({ message: msg, success: false, code: failCode });
    return;
  }
  const attemptKey = redisKeys.auth.otpAttempts(normalizedEmail);
  const count = await redis.incr(attemptKey);
  if (count === 1) {
    await redis.expire(attemptKey, AUTH_TTL.otpAttemptBlockSec);
  }
  const attemptsLeft = Math.max(0, AUTH_TTL.otpAttemptLimit - count);
  if (count >= AUTH_TTL.otpAttemptLimit) {
    const ttl = await redis.ttl(attemptKey);
    const retrySec = ttl > 0 ? ttl : AUTH_TTL.otpAttemptBlockSec;
    res.setHeader("Retry-After", String(retrySec));
    res.status(429).json({
      message: `Too many invalid codes for this email. Please wait ${Math.ceil(retrySec / 60)} minute(s) before trying again.`,
      success: false,
      retryAfter: retrySec,
      attemptsLeft: 0,
      code: failCode,
    });
    return;
  }
  res.status(401).json({
    message: msg,
    success: false,
    attemptsLeft,
    code: failCode,
  });
}
async function createUserFromEmailSignup(
  req: Request,
  normalizedEmail: string,
  signupFullName: string,
): Promise<{
  user: InstanceType<typeof UserModel>;
  isNewUser: true;
}> {
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  const username =
    signupFullName.trim().toLowerCase().replaceAll(/\s+/g, "") + randomNumber;
  const user = new UserModel({
    fullName: signupFullName,
    username,
    email: normalizedEmail,
    bio: DEFAULT_PROFILE_BIO,
    profileImg: newRandomDiceBearAvatarSvgUrl(),
    isGoogleAccount: false,
    isGitAccount: false,
    isFacebookAccount: false,
    isXAccount: false,
    isAppleAccount: false,
    isDiscordAccount: false,
    emailVerified: true,
  });
  await user.save();
  const subscription = await SubscriptionModel.create({
    userId: user._id,
    plan: "free",
    status: "active",
  });
  user.subscription = subscription._id;
  await user.save();
  await logSecurityEvent(String(user._id), "login_success", req, {
    source: "signup_email",
  });
  void writeAuditLog(req, AuditAction.USER_SIGNUP, {
    actorId: String(user._id),
    metadata: { source: "email" },
  });
  try {
    const refCode = await resolveReferralInput(req);
    await applyReferralOnNewUser({
      req,
      newUser: user,
      refCode,
      source: "email",
    });
  } catch (e) {
    console.error(e);
  }
  await recordSignupLegalAcceptances(user._id, req);
  return { user, isNewUser: true };
}
async function rejectVerifyIfOtpRateLimited(
  redis: ReturnType<typeof getRedis>,
  normalizedEmail: string,
  res: Response,
): Promise<boolean> {
  if (!redis) return false;
  const attemptKey = redisKeys.auth.otpAttempts(normalizedEmail);
  const attemptRaw = await redis.get(attemptKey);
  const attempts = attemptRaw ? Number.parseInt(attemptRaw, 10) || 0 : 0;
  if (attempts < AUTH_TTL.otpAttemptLimit) return false;
  const blockTtl = await redis.ttl(attemptKey);
  const waitMin =
    blockTtl > 0
      ? Math.ceil(blockTtl / 60)
      : Math.ceil(AUTH_TTL.otpAttemptBlockSec / 60);
  res.status(429).json({
    message: `Too many invalid codes for this email. Please wait ${waitMin} minute(s) before trying again.`,
    success: false,
    retryAfter: blockTtl > 0 ? blockTtl : AUTH_TTL.otpAttemptBlockSec,
    attemptsLeft: 0,
  });
  return true;
}
async function resolveUserAfterOtpVerified(
  req: Request,
  res: Response,
  userPrecheck: InstanceType<typeof UserModel> | null,
  purpose: EmailOtpPurpose,
  stored: StoredLoginOtp | StoredSignupOtp,
  normalizedEmail: string,
): Promise<{
  user: InstanceType<typeof UserModel>;
  isNewUser: boolean;
} | null> {
  const signupFullName =
    purpose === "signup" ? (stored as StoredSignupOtp).fullName : undefined;
  if (signupFullName && !userPrecheck) {
    const created = await createUserFromEmailSignup(
      req,
      normalizedEmail,
      signupFullName,
    );
    return { user: created.user, isNewUser: created.isNewUser };
  }
  if (userPrecheck) {
    await logSecurityEvent(String(userPrecheck._id), "login_success", req, {
      source: "otp",
    });
    return { user: userPrecheck, isNewUser: false };
  }
  res
    .status(400)
    .json({ message: "No account found. Sign up first.", success: false });
  return null;
}
async function resolvePlayReviewerUser(
  req: Request,
  userPrecheck: InstanceType<typeof UserModel> | null,
  normalizedEmail: string,
): Promise<{
  user: InstanceType<typeof UserModel>;
  isNewUser: boolean;
}> {
  if (userPrecheck) {
    await logSecurityEvent(String(userPrecheck._id), "login_success", req, {
      source: "play_reviewer_otp",
    });
    return { user: userPrecheck, isNewUser: false };
  }
  const created = await createUserFromEmailSignup(
    req,
    normalizedEmail,
    "Google Play Reviewer",
  );
  return { user: created.user, isNewUser: created.isNewUser };
}
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, code, otpVersion } = req.body as {
      email: string;
      code: string;
      otpVersion?: number;
    };
    const normalizedEmail = email.toLowerCase().trim();
    const otpCode = String(code ?? "")
      .replaceAll(/\D/g, "")
      .slice(0, 6);
    if (otpCode.length !== 6) {
      res.status(400).json({
        message: "Enter the 6-digit code from your email.",
        success: false,
      });
      return;
    }
    const redis = getRedis();
    if (await rejectVerifyIfOtpRateLimited(redis, normalizedEmail, res)) return;
    const userPrecheck = await UserModel.findOne({ email: normalizedEmail });
    const purpose: EmailOtpPurpose = userPrecheck ? "login" : "signup";
    const reviewerOtpValid = isPlayReviewerOtp(normalizedEmail, otpCode);
    const stored =
      purpose === "login"
        ? await getStoredLoginOtp(normalizedEmail)
        : await getStoredSignupOtp(normalizedEmail);
    const versionBad = !!(stored && isOtpVersionMismatch(stored, otpVersion));
    const otpValid = !!(
      stored &&
      !versionBad &&
      verifyEmailOtpHash(stored.h, normalizedEmail, otpCode)
    );
    if (!reviewerOtpValid && versionBad) {
      await failOtpVerification(
        req,
        res,
        redis,
        normalizedEmail,
        "stale_otp_version",
      );
      return;
    }
    if (!reviewerOtpValid && !otpValid) {
      await failOtpVerification(
        req,
        res,
        redis,
        normalizedEmail,
        "invalid_otp",
      );
      return;
    }
    if (purpose === "signup") {
      const accept = !!(
        req.body as {
          acceptPolicies?: boolean;
        }
      ).acceptPolicies;
      if (!accept) {
        res.status(403).json({
          success: false,
          code: "LEGAL_ACCEPT_REQUIRED" as const,
          message:
            "Please confirm that you agree to the Terms of Service and Privacy Policy.",
        });
        return;
      }
    }
    if (!reviewerOtpValid) {
      await deleteEmailOtp(purpose, normalizedEmail);
    }
    if (redis) {
      await redis.del(redisKeys.auth.otpAttempts(normalizedEmail));
    }
    const resolved = reviewerOtpValid
      ? await resolvePlayReviewerUser(req, userPrecheck, normalizedEmail)
      : stored
        ? await resolveUserAfterOtpVerified(
            req,
            res,
            userPrecheck,
            purpose,
            stored,
            normalizedEmail,
          )
        : null;
    if (!resolved) return;
    bumpOtpMetric("otp_verify_success_total");
    void writeAuditLog(req, AuditAction.OTP_VERIFIED, {
      actorId: String(resolved.user._id),
      metadata: {
        email: normalizedEmail,
        purpose,
        ...(reviewerOtpValid ? { source: "play_reviewer_otp" } : {}),
      },
    });
    await respondWithSessionAfterEmailAuth(
      req,
      res,
      resolved.user,
      resolved.isNewUser,
    );
  } catch (err) {
    console.error(err);
    const redisDown =
      err instanceof Error && err.message === "Redis required for OTP";
    res.status(500).json({
      message: redisDown
        ? "Service temporarily unavailable. Try again later."
        : "Internal Server Error 💀",
      success: false,
      ...(redisDown ? { code: "REDIS_UNAVAILABLE" as const } : {}),
    });
  }
}
