import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const sendOtpSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
});

const signupEmailSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  code: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export function sendOtpValidation(req: Request, res: Response, next: NextFunction): void {
  const { error } = sendOtpSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: 'Validation error', error: error.details, success: false });
    return;
  }
  next();
}

export function signupEmailValidation(req: Request, res: Response, next: NextFunction): void {
  const { error } = signupEmailSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: 'Validation error', error: error.details, success: false });
    return;
  }
  next();
}

export function verifyOtpValidation(req: Request, res: Response, next: NextFunction): void {
  const { error } = verifyOtpSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: 'Validation error', error: error.details, success: false });
    return;
  }
  next();
}
