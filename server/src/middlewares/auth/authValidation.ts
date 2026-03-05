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

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).trim(),
  username: Joi.string().min(2).max(30).pattern(/^[a-zA-Z0-9_]+$/).trim().lowercase(),
  bio: Joi.string().max(500).allow('').trim(),
  profileImg: Joi.string().max(2000).allow('').trim(),
  coverBanner: Joi.string().max(2000).allow('').trim(),
  job: Joi.string().max(100).allow('').trim(),
  linkedin: Joi.string().uri().allow('').trim(),
  instagram: Joi.string().max(200).allow('').trim(),
  github: Joi.string().uri().allow('').trim(),
  youtube: Joi.string().uri().allow('').trim(),
  stackAndTools: Joi.array().items(Joi.string().max(80)).max(50),
  mySetup: Joi.string().max(2000).allow('').trim(),
  workExperiences: Joi.array().items(
    Joi.object({
      company: Joi.string().max(120),
      role: Joi.string().max(120),
      startDate: Joi.string().max(20),
      endDate: Joi.string().max(20),
      description: Joi.string().max(500),
    })
  ).max(20),
  education: Joi.array().items(
    Joi.object({
      school: Joi.string().max(120),
      degree: Joi.string().max(80),
      field: Joi.string().max(80),
      startYear: Joi.number().integer().min(1900).max(2100),
      endYear: Joi.number().integer().min(1900).max(2100),
    })
  ).max(15),
  projects: Joi.array().items(
    Joi.object({
      name: Joi.string().max(120),
      url: Joi.string().uri().allow(''),
      description: Joi.string().max(500),
    })
  ).max(30),
  openSourceContributions: Joi.array().items(
    Joi.object({
      repo: Joi.string().max(200),
      description: Joi.string().max(500),
      url: Joi.string().uri().allow(''),
    })
  ).max(30),
}).min(1);

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

export function updateProfileValidation(req: Request, res: Response, next: NextFunction): void {
  const { error } = updateProfileSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    res.status(400).json({ message: 'Validation error', error: error.details, success: false });
    return;
  }
  next();
}
