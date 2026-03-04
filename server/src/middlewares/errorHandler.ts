import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
}
