import { Router } from 'express';
import {
  sendOtp,
  signupEmail,
  verifyOtp,
  refresh,
  logout,
  me,
  disconnectProvider,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  initQrLogin,
  approveQrLogin,
  pollQrLogin,
  verifyTwoFactorLogin,
} from '../controllers/auth.controller';
import {
  idempotency,
  sendOtpValidation,
  signupEmailValidation,
  verifyOtpValidation,
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
router.get('/me', verifyToken, me);
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
