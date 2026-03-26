import { Request, Response } from 'express';
import { UserModel } from '../../../models/User';
import { SubscriptionModel } from '../../../models/Subscription';
import { authConfig } from '../../../config/auth.config';
import { getRedis } from '../../../config/redis';
import { env } from '../../../config/env';
import { writeAuditLog } from '../../../shared/audit/auditLog';
import { AuditAction } from '../../../shared/audit/events';
import {
  sendAuthEmail,
  isAuthEmailConfigured,
  getEmailSendErrorMessage,
  isMailSendError,
} from '../../../infrastructure/mail/sendAuthEmail';
import { bumpOtpMetric } from '../../../shared/metrics/otpMetrics';
import { createChallenge } from 'altcha-lib';
import { respondWithSessionAfterEmailAuth } from '../../../services/authLogin.service';
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
  type StoredSignupOtp,
} from '../../../services/emailOtp.service';
import { redisKeys } from '../../../shared/redis/keys';
import { logSecurityEvent } from '../securityEventLog';

const OTP_ATTEMPT_LIMIT = 10;
const OTP_ATTEMPT_BLOCK_SECONDS = 5 * 60;

export async function getAltchaChallenge(_req: Request, res: Response): Promise<void> {
  const key = env.ALTCHA_HMAC_KEY?.trim() || process.env.JWT_SECRET?.trim();
  if (!key) {
    res.status(503).json({
      success: false,
      message: 'ALTCHA challenge unavailable. Set ALTCHA_HMAC_KEY or JWT_SECRET.',
    });
    return;
  }
  try {
    const challenge = await createChallenge({ hmacKey: key, maxNumber: 1_000_000 });
    res.status(200).json(challenge);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to create challenge' });
  }
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  try {
    if (!isAuthEmailConfigured()) {
      res.status(503).json({
        message: 'Email is not configured. Cannot send login code.',
        success: false,
      });
      return;
    }
    const { email } = req.body as { email: string };
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (!existing) {
      bumpOtpMetric('otp_send_rejected_total');
      res.status(404).json({
        message: 'No account found with this email. Please sign up first.',
        success: false,
      });
      return;
    }
    const canResend = await assertOtpMinResendOrReject('login', normalizedEmail, res);
    if (!canResend) {
      bumpOtpMetric('otp_send_rejected_total');
      return;
    }
    const allowed = await registerEmailOtpSendOrReject(normalizedEmail, res);
    if (!allowed) {
      bumpOtpMetric('otp_send_rejected_total');
      return;
    }

    await invalidateOppositeEmailOtp('login', normalizedEmail);
    const code = generateEmailOtpDigits();
    const otpVersion = await storeEmailOtpLogin(normalizedEmail, code);
    const ttlMin = Math.ceil(authConfig.OTP_LOGIN_TTL_SECONDS / 60);
    await sendAuthEmail({
      to: normalizedEmail,
      subject: 'Your Syntax Stories login code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #5f4fe6;">Your verification code</h2>
          <p style="font-size: 16px;">Use this code to sign in:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p style="font-size: 14px; color: #666;">This code expires in ${ttlMin} minute(s).</p>
        </div>
      `,
    });
    await markOtpResendGate('login', normalizedEmail);
    bumpOtpMetric('otp_send_total');
    void writeAuditLog(req, AuditAction.OTP_SENT, { metadata: { channel: 'email', purpose: 'login', email: normalizedEmail } });
    res.status(200).json({
      message: 'Verification code sent to your email 📧',
      success: true,
      otpVersion,
      expiresInSeconds: authConfig.OTP_LOGIN_TTL_SECONDS,
    });
  } catch (err) {
    console.error(err);
    const message =
      (err as Error).message === 'Redis required for OTP'
        ? 'Service temporarily unavailable. Try again later.'
        : (err as { code?: string }).code === 'EAUTH'
          ? getEmailSendErrorMessage(err)
          : isMailSendError(err) && err.kind === 'transient'
            ? 'Email delivery is temporarily unavailable. Try again shortly.'
            : 'Internal Server Error 💀';
    res.status(500).json({ message, success: false });
  }
}

export async function signupEmail(req: Request, res: Response): Promise<void> {
  try {
    if (!isAuthEmailConfigured()) {
      res.status(503).json({
        message: 'Email is not configured. Cannot send verification code.',
        success: false,
      });
      return;
    }
    const { fullName, email } = req.body as { fullName: string; email: string };
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFullName = fullName?.trim() || 'User';
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      bumpOtpMetric('otp_send_rejected_total');
      res.status(409).json({
        message: 'An account with this email already exists. Sign in with email instead.',
        success: false,
      });
      return;
    }
    const canResend = await assertOtpMinResendOrReject('signup', normalizedEmail, res);
    if (!canResend) {
      bumpOtpMetric('otp_send_rejected_total');
      return;
    }
    const allowed = await registerEmailOtpSendOrReject(normalizedEmail, res);
    if (!allowed) {
      bumpOtpMetric('otp_send_rejected_total');
      return;
    }

    await invalidateOppositeEmailOtp('signup', normalizedEmail);
    const code = generateEmailOtpDigits();
    const otpVersion = await storeEmailOtpSignup(normalizedEmail, code, normalizedFullName);
    const ttlMin = Math.ceil(authConfig.OTP_SIGNUP_TTL_SECONDS / 60);
    await sendAuthEmail({
      to: normalizedEmail,
      subject: 'Verify your Syntax Stories account',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #5f4fe6;">Welcome to Syntax Stories</h2>
          <p style="font-size: 16px;">Your verification code:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p style="font-size: 14px; color: #666;">This code expires in ${ttlMin} minute(s).</p>
        </div>
      `,
    });
    await markOtpResendGate('signup', normalizedEmail);
    bumpOtpMetric('otp_send_total');
    void writeAuditLog(req, AuditAction.OTP_SENT, { metadata: { channel: 'email', purpose: 'signup', email: normalizedEmail } });
    res.status(200).json({
      message: 'Verification code sent to your email 📧',
      success: true,
      otpVersion,
      expiresInSeconds: authConfig.OTP_SIGNUP_TTL_SECONDS,
    });
  } catch (err) {
    console.error(err);
    const message =
      (err as Error).message === 'Redis required for OTP'
        ? 'Service temporarily unavailable.'
        : (err as { code?: string }).code === 'EAUTH'
          ? getEmailSendErrorMessage(err)
          : isMailSendError(err) && err.kind === 'transient'
            ? 'Email delivery is temporarily unavailable. Try again shortly.'
            : 'Internal Server Error 💀';
    res.status(500).json({ message, success: false });
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, code, otpVersion } = req.body as {
      email: string;
      code: string;
      otpVersion?: number;
    };
    const normalizedEmail = email.toLowerCase().trim();
    const otpCode = String(code ?? '').replace(/\D/g, '').slice(0, 6);
    if (otpCode.length !== 6) {
      res.status(400).json({
        message: 'Enter the 6-digit code from your email.',
        success: false,
      });
      return;
    }
    const redis = getRedis();

    if (redis) {
      const attemptKey = redisKeys.auth.otpAttempts(normalizedEmail);
      const attemptRaw = await redis.get(attemptKey);
      const attempts = attemptRaw ? parseInt(attemptRaw, 10) || 0 : 0;
      if (attempts >= OTP_ATTEMPT_LIMIT) {
        const blockTtl = await redis.ttl(attemptKey);
        const waitMin = blockTtl > 0 ? Math.ceil(blockTtl / 60) : Math.ceil(OTP_ATTEMPT_BLOCK_SECONDS / 60);
        res.status(429).json({
          message: `Too many invalid codes for this email. Please wait ${waitMin} minute(s) before trying again.`,
          success: false,
          retryAfter: blockTtl > 0 ? blockTtl : OTP_ATTEMPT_BLOCK_SECONDS,
          attemptsLeft: 0,
        });
        return;
      }
    }

    const userPrecheck = await UserModel.findOne({ email: normalizedEmail });
    const purpose: EmailOtpPurpose = userPrecheck ? 'login' : 'signup';
    const stored =
      purpose === 'login'
        ? await getStoredLoginOtp(normalizedEmail)
        : await getStoredSignupOtp(normalizedEmail);

    const versionBad = !!(stored && isOtpVersionMismatch(stored, otpVersion));
    const otpValid = !!(
      stored &&
      !versionBad &&
      verifyEmailOtpHash(stored.h, normalizedEmail, otpCode)
    );

    async function failVerify(reason: 'invalid_otp' | 'stale_otp_version'): Promise<void> {
      bumpOtpMetric('otp_verify_fail_total');
      await logSecurityEvent(null, 'login_failure', req, { email: normalizedEmail, reason });
      void writeAuditLog(req, AuditAction.OTP_FAILED, { metadata: { email: normalizedEmail, reason } });

      if (redis) {
        const attemptKey = redisKeys.auth.otpAttempts(normalizedEmail);
        const count = await redis.incr(attemptKey);
        if (count === 1) {
          await redis.expire(attemptKey, OTP_ATTEMPT_BLOCK_SECONDS);
        }
        const attemptsLeft = Math.max(0, OTP_ATTEMPT_LIMIT - count);
        if (count >= OTP_ATTEMPT_LIMIT) {
          const ttl = await redis.ttl(attemptKey);
          res.setHeader('Retry-After', String(ttl > 0 ? ttl : OTP_ATTEMPT_BLOCK_SECONDS));
          res.status(429).json({
            message: `Too many invalid codes for this email. Please wait ${Math.ceil((ttl > 0 ? ttl : OTP_ATTEMPT_BLOCK_SECONDS) / 60)} minute(s) before trying again.`,
            success: false,
            retryAfter: ttl > 0 ? ttl : OTP_ATTEMPT_BLOCK_SECONDS,
            attemptsLeft: 0,
          });
          return;
        }
        res.status(401).json({
          message:
            reason === 'stale_otp_version'
              ? 'That code is no longer valid. Use the code from your latest email or request a new one.'
              : 'Invalid or expired code. Use Resend code or go back to request a new one.',
          success: false,
          attemptsLeft,
        });
        return;
      }

      res.status(401).json({
        message:
          reason === 'stale_otp_version'
            ? 'That code is no longer valid. Use the code from your latest email or request a new one.'
            : 'Invalid or expired code. Use Resend code or go back to request a new one.',
        success: false,
      });
    }

    if (versionBad) {
      await failVerify('stale_otp_version');
      return;
    }
    if (!otpValid) {
      await failVerify('invalid_otp');
      return;
    }

    await deleteEmailOtp(purpose, normalizedEmail);

    if (redis) {
      const attemptKey = redisKeys.auth.otpAttempts(normalizedEmail);
      await redis.del(attemptKey);
    }
    let user = userPrecheck;
    let isNewUser = false;
    const signupFullName =
      purpose === 'signup' ? (stored as StoredSignupOtp).fullName : undefined;
    if (signupFullName && !user) {
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const username =
        signupFullName.trim().toLowerCase().replace(/\s+/g, '') + randomNumber;
      user = new UserModel({
        fullName: signupFullName,
        username,
        email: normalizedEmail,
        isGoogleAccount: false,
        isGitAccount: false,
        isFacebookAccount: false,
        isXAccount: false,
        isAppleAccount: false,
        isDiscordAccount: false,
        emailVerified: true,
      });
      await user.save();
      isNewUser = true;
      const subscription = await SubscriptionModel.create({
        userId: user._id,
        plan: 'free',
        status: 'active',
      });
      user.subscription = subscription._id;
      await user.save();
      await logSecurityEvent(String(user._id), 'login_success', req, { source: 'signup_email' });
      void writeAuditLog(req, AuditAction.USER_SIGNUP, { actorId: String(user._id), metadata: { source: 'email' } });
    } else if (user) {
      await logSecurityEvent(String(user._id), 'login_success', req, { source: 'otp' });
    } else {
      res.status(400).json({ message: 'No account found. Sign up first.', success: false });
      return;
    }

    bumpOtpMetric('otp_verify_success_total');
    void writeAuditLog(req, AuditAction.OTP_VERIFIED, {
      actorId: String(user._id),
      metadata: { email: normalizedEmail, purpose },
    });
    await respondWithSessionAfterEmailAuth(req, res, user, isNewUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}
