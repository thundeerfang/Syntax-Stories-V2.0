"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/send-otp', auth_1.rateLimitSendOtp, auth_1.idempotency, auth_1.sendOtpValidation, auth_controller_1.sendOtp);
router.post('/signup-email', auth_1.rateLimitSignupEmail, auth_1.idempotency, auth_1.signupEmailValidation, auth_controller_1.signupEmail);
router.post('/verify-otp', auth_1.rateLimitVerifyOtp, auth_1.idempotency, auth_1.verifyOtpValidation, auth_controller_1.verifyOtp);
router.post('/refresh', auth_1.rateLimitRefresh, auth_controller_1.refresh);
router.post('/logout', auth_1.verifyToken, auth_controller_1.logout);
router.post('/revoke-session', auth_controller_1.revokeSessionByRefreshToken);
router.get('/me', auth_1.verifyToken, auth_controller_1.me);
router.patch('/profile', auth_1.verifyToken, auth_1.updateProfileValidation, auth_controller_1.updateProfile);
const cvUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf')
            cb(null, true);
        else
            cb(new Error('Only PDF files are allowed'));
    },
});
router.post('/parse-cv', auth_1.verifyToken, cvUpload.single('pdf'), auth_controller_1.parseCv);
router.post('/link-request', auth_1.verifyToken, auth_controller_1.linkRequest);
router.post('/email-change/init', auth_1.verifyToken, auth_controller_1.initEmailChange);
router.post('/email-change/verify', auth_1.verifyToken, auth_controller_1.verifyEmailChange);
router.post('/email-change/cancel', auth_1.verifyToken, auth_controller_1.cancelEmailChange);
router.post('/disconnect/:provider', auth_1.verifyToken, auth_controller_1.disconnectProvider);
router.post('/2fa/setup', auth_1.verifyToken, auth_controller_1.setupTwoFactor);
router.post('/2fa/enable', auth_1.verifyToken, auth_controller_1.enableTwoFactor);
router.post('/2fa/disable', auth_1.verifyToken, auth_controller_1.disableTwoFactor);
router.post('/2fa/verify-login', auth_controller_1.verifyTwoFactorLogin);
router.post('/qr-login/init', auth_controller_1.initQrLogin);
router.post('/qr-login/approve', auth_1.verifyToken, auth_controller_1.approveQrLogin);
router.post('/qr-login/poll', auth_controller_1.pollQrLogin);
router.get('/status', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Auth API is running',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map