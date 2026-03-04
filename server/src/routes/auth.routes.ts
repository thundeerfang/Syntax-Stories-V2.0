import { Router } from 'express';
import {
  sendOtp,
  signupEmail,
  verifyOtp,
  refresh,
  logout,
  me,
  disconnectProvider,
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
router.get('/status', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
