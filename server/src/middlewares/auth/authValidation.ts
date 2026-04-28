import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { updateProfileSchema } from './profileZodSchemas.js';
import { formatZodError } from './zodFormat.js';

export * from './profileZodSchemas.js';

const altchaField = z.union([z.string().max(20000), z.record(z.unknown())]).optional();

const sendOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  altcha: altchaField,
});

const signupEmailSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  altcha: altchaField,
});

const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z
    .string()
    .transform((val) => String(val).replaceAll(/\D/g, '').slice(0, 6))
    .pipe(z.string().length(6, { message: 'Code must be exactly 6 digits.' })),
  otpVersion: z.number().int().min(1).optional(),
});

export function sendOtpValidation(req: Request, res: Response, next: NextFunction): void {
  const r = sendOtpSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ message: 'Validation error', error: formatZodError(r.error), success: false });
    return;
  }
  req.body = r.data;
  next();
}

export function signupEmailValidation(req: Request, res: Response, next: NextFunction): void {
  const r = signupEmailSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ message: 'Validation error', error: formatZodError(r.error), success: false });
    return;
  }
  req.body = r.data;
  next();
}

export function verifyOtpValidation(req: Request, res: Response, next: NextFunction): void {
  const r = verifyOtpSchema.safeParse(req.body);
  if (!r.success) {
    const msg = r.error.issues[0]?.message?.replaceAll('"', '') ?? 'Validation error';
    res.status(400).json({ message: msg, error: formatZodError(r.error), success: false });
    return;
  }
  req.body = r.data;
  next();
}

export function updateProfileValidation(req: Request, res: Response, next: NextFunction): void {
  const r = updateProfileSchema.safeParse(req.body);
  if (!r.success) {
    const details = formatZodError(r.error);
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      details,
      error: details,
    });
    return;
  }
  req.body = r.data;
  next();
}
