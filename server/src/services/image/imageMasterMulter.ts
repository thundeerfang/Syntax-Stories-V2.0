import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { IMAGE_UPLOAD_REJECT_MESSAGE, isAllowedImageUploadMime } from '../../config/uploadValidation.js';
import { IMAGE_MASTER_PROFILES, type ImageMasterProfile } from './imageMaster.constants.js';

type MulterOpts = {
  /** Reject GIF (e.g. org logos). */
  rejectGif?: boolean;
  rejectMessage?: string;
};

export function createImageMasterMulter(profile: ImageMasterProfile, opts?: MulterOpts) {
  const cfg = IMAGE_MASTER_PROFILES[profile];
  const rejectMessage = opts?.rejectMessage ?? IMAGE_UPLOAD_REJECT_MESSAGE;

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: cfg.maxInputBytes + 512 },
    fileFilter: (_req, file, cb) => {
      if (!isAllowedImageUploadMime(file.mimetype, file.originalname)) {
        cb(new Error(rejectMessage));
        return;
      }
      if (opts?.rejectGif && /gif/i.test(file.mimetype)) {
        cb(new Error(rejectMessage));
        return;
      }
      cb(null, true);
    },
  });
}

export function runImageMasterUpload(
  upload: multer.Multer,
  field: string,
  profile: ImageMasterProfile
) {
  const maxMb = Math.round(IMAGE_MASTER_PROFILES[profile].maxInputBytes / (1024 * 1024));

  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single(field)(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          message: `Image file is too large (max ${maxMb} MB).`,
        });
        return;
      }
      const msg = err instanceof Error ? err.message : IMAGE_UPLOAD_REJECT_MESSAGE;
      res.status(400).json({ success: false, message: msg });
    });
  };
}
