import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { isAppHttpError } from '../errors/httpErrors.js';
import { sendAppHttpError } from '../errors/sendAppHttpError.js';
import {
  maybeActivateFromError,
  storageFullPublicMessage,
} from '../services/platform/storageGuard.service.js';

export async function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'Image file is too large.' });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({ success: false, message: 'Invalid file upload' });
      return;
    }
  }
  const uploadMsg = err.message?.trim() ?? '';
  if (
    uploadMsg.includes('Please upload a JPEG') ||
    uploadMsg.includes('Only JPEG, PNG, GIF, or WebP') ||
    uploadMsg.includes('Only images (JPEG')
  ) {
    res.status(400).json({ success: false, message: uploadMsg });
    return;
  }
  if (isAppHttpError(err)) {
    sendAppHttpError(res, err);
    return;
  }
  if (await maybeActivateFromError(err)) {
    res.status(503).json({
      success: false,
      code: 'STORAGE_FULL',
      message: storageFullPublicMessage(),
    });
    return;
  }
  if (req.requestId) console.error(`[requestId=${req.requestId}]`, err);
  else console.error(err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
}
