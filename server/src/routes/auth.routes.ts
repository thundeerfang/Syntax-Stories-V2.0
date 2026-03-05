import { Router } from 'express';
import {
  sendOtp,
  signupEmail,
  verifyOtp,
  refresh,
  logout,
  revokeSessionByRefreshToken,
  me,
  linkRequest,
  initEmailChange,
  verifyEmailChange,
  disconnectProvider,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  initQrLogin,
  approveQrLogin,
  pollQrLogin,
  verifyTwoFactorLogin,
  updateProfile,
} from '../controllers/auth.controller';
import {
  idempotency,
  sendOtpValidation,
  signupEmailValidation,
  verifyOtpValidation,
  updateProfileValidation,
  verifyToken,
  rateLimitSendOtp,
  rateLimitVerifyOtp,
  rateLimitSignupEmail,
  rateLimitRefresh,
} from '../middlewares/auth';

const router = Router();

router.post('/send-otp', rateLimitSendOtp, idempotency, sendOtpValidation, sendOtp);
router.post('/signup-email', rateLimitSignupEmail, idempotency, signupEmailValidation, signupEmail);
router.post('/verify-otp', rateLimitVerifyOtp, idempotency, verifyOtpValidation, verifyOtp);
router.post('/refresh', rateLimitRefresh, refresh);
router.post('/logout', verifyToken, logout);
router.post('/revoke-session', revokeSessionByRefreshToken);
router.get('/me', verifyToken, me);
router.patch('/profile', verifyToken, updateProfileValidation, updateProfile);
router.post('/link-request', verifyToken, linkRequest);
router.post('/email-change/init', verifyToken, initEmailChange);
router.post('/email-change/verify', verifyToken, verifyEmailChange);
router.post('/disconnect/:provider', verifyToken, disconnectProvider);
router.post('/2fa/setup', verifyToken, setupTwoFactor);
router.post('/2fa/enable', verifyToken, enableTwoFactor);
router.post('/2fa/disable', verifyToken, disableTwoFactor);
router.post('/2fa/verify-login', verifyTwoFactorLogin);
router.post('/qr-login/init', initQrLogin);
router.post('/qr-login/approve', verifyToken, approveQrLogin);
router.post('/qr-login/poll', pollQrLogin);


router.get('/status', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
