import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'File too large' });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({ success: false, message: 'Invalid file upload' });
      return;
    }
  }
  console.error(err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
}
