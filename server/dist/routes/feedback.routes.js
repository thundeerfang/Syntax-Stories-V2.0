import { Router } from 'express';
import multer from 'multer';
import { optionalVerifyToken } from '../middlewares/auth/optionalVerifyToken.js';
import { verifyAltchaIfConfigured } from '../middlewares/auth/verifyAltcha.js';
import { rateLimitFeedback } from '../middlewares/auth/rateLimitAuth.js';
import { listFeedbackCategories, submitFeedback } from '../controllers/feedback.controller.js';
import { isAllowedImageMime } from '../config/uploadValidation.js';
import { IMAGE_MASTER_PROFILES } from '../services/image/imageMaster.constants.js';
const router = Router();
function requireAltchaUnlessAuthed(req, res, next) {
    const u = req.authUser;
    if (u?._id) {
        next();
        return;
    }
    void verifyAltchaIfConfigured(req, res, next);
}
const uploadFeedback = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: IMAGE_MASTER_PROFILES.feedback.maxInputBytes + 512 },
    fileFilter: (_req, file, cb) => {
        if (!isAllowedImageMime(file.mimetype)) {
            cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed.'));
            return;
        }
        cb(null, true);
    },
});
function runUploadFeedback(req, res, next) {
    uploadFeedback.single('attachment')(req, res, (err) => {
        if (!err) {
            next();
            return;
        }
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({
                    success: false,
                    message: `Attachment exceeds maximum size (${Math.round(IMAGE_MASTER_PROFILES.feedback.maxInputBytes / (1024 * 1024))} MB).`,
                });
                return;
            }
        }
        const msg = err instanceof Error ? err.message : 'Upload failed.';
        res.status(400).json({ success: false, message: msg });
    });
}
router.get('/categories', listFeedbackCategories);
router.post('/', rateLimitFeedback, optionalVerifyToken, runUploadFeedback, requireAltchaUnlessAuthed, submitFeedback);
export default router;
//# sourceMappingURL=feedback.routes.js.map