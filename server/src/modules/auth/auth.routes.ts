import { Router } from 'express';
import { isRedisAvailable } from '../../config/redis.js';
import {
  getAltchaChallenge,
  sendOtp,
  signupEmail,
  verifyOtp,
} from './controllers/otp.controller.js';
import { staffLogin } from '../../admin-platform/auth/staffLogin.controller.js';
import {
  initEmailChange,
  verifyEmailChange,
  cancelEmailChange,
} from './controllers/emailChange.controller.js';
import { linkRequest, disconnectProvider } from './controllers/oauthLink.controller.js';
import { me, updateProfile, updateProfileSection } from '../profile/profile.controller.js';
import { initQrLogin, approveQrLogin, pollQrLogin } from './controllers/qrLogin.controller.js';
import {
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorLogin,
} from './controllers/twoFactor.controller.js';
import { verifyStepUp } from '../../admin-platform/auth/stepUp.controller.js';
import {
  getPasskeyStatusHandler,
  passkeyPreferences,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  passkeyRemove,
  passkeyStepUpOptions,
  passkeyStepUpVerify,
} from '../../admin-platform/auth/passkey.controller.js';
import { refresh, logout, revokeSessionByRefreshToken } from './controllers/session.controller.js';
import { exchangeOAuthCode } from './controllers/oauthExchange.controller.js';
import {
  idempotency,
  sendOtpValidation,
  signupEmailValidation,
  verifyOtpValidation,
  staffLoginValidation,
  updateProfileValidation,
  updateProfileSectionBodyValidation,
  verifyToken,
  verifyAltchaIfConfigured,
  rateLimitSendOtp,
  rateLimitVerifyOtp,
  rateLimitSignupEmail,
  rateLimitStaffLogin,
  rateLimitRefresh,
  rateLimitUpdateProfile,
} from '../../middlewares/auth/index.js';

const router = Router();

router.get('/altcha/challenge', getAltchaChallenge);
router.post('/oauth/exchange', exchangeOAuthCode);
router.post('/staff-login', rateLimitStaffLogin, staffLoginValidation, staffLogin);
router.post(
  '/send-otp',
  rateLimitSendOtp,
  idempotency,
  verifyAltchaIfConfigured,
  sendOtpValidation,
  sendOtp
);
router.post(
  '/signup-email',
  rateLimitSignupEmail,
  idempotency,
  verifyAltchaIfConfigured,
  signupEmailValidation,
  signupEmail
);
router.post('/verify-otp', rateLimitVerifyOtp, idempotency, verifyOtpValidation, verifyOtp);
router.post('/refresh', rateLimitRefresh, refresh);
router.post('/logout', verifyToken, logout);
router.post('/revoke-session', revokeSessionByRefreshToken);
router.get('/me', verifyToken, me);
router.patch(
  '/profile',
  verifyToken,
  rateLimitUpdateProfile,
  updateProfileValidation,
  updateProfile
);
router.patch(
  '/profile/:section',
  verifyToken,
  rateLimitUpdateProfile,
  updateProfileSectionBodyValidation,
  updateProfileSection
);

router.post('/link-request', verifyToken, linkRequest);
router.post('/email-change/init', verifyToken, initEmailChange);
router.post('/email-change/verify', verifyToken, verifyEmailChange);
router.post('/email-change/cancel', verifyToken, cancelEmailChange);
router.post('/disconnect/:provider', verifyToken, disconnectProvider);
router.post('/2fa/setup', verifyToken, setupTwoFactor);
router.post('/2fa/enable', verifyToken, enableTwoFactor);
router.post('/2fa/disable', verifyToken, disableTwoFactor);
router.post('/2fa/verify-login', verifyTwoFactorLogin);
router.post('/2fa/step-up', verifyToken, verifyStepUp);
router.get('/passkey/status', verifyToken, getPasskeyStatusHandler);
router.post('/passkey/register/options', verifyToken, passkeyRegisterOptions);
router.post('/passkey/register/verify', verifyToken, passkeyRegisterVerify);
router.patch('/passkey/preferences', verifyToken, passkeyPreferences);
router.post('/passkey/remove', verifyToken, passkeyRemove);
router.post('/2fa/step-up/passkey/options', verifyToken, passkeyStepUpOptions);
router.post('/2fa/step-up/passkey/verify', verifyToken, passkeyStepUpVerify);
router.post('/qr-login/init', initQrLogin);
router.post('/qr-login/approve', verifyToken, approveQrLogin);
router.post('/qr-login/poll', pollQrLogin);

router.get('/status', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth API is running',
    timestamp: new Date().toISOString(),
    redis: isRedisAvailable(),
  });
});

export default router;
