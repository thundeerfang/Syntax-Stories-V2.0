import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { isProfileUpdateSection } from '../../modules/profile/profile.types.js';
import {
  updateProfileBasicSchema,
  updateProfileCertificationsSchema,
  updateProfileEducationSchema,
  updateProfileProjectsSchema,
  updateProfileSetupSchema,
  updateProfileSocialSchema,
  updateProfileStackSchema,
  updateProfileWorkSchema,
} from './profileZodSchemas.js';
import { formatZodError } from './zodFormat.js';

function sectionValidation(schema: ZodTypeAny, req: Request, res: Response, next: NextFunction): void {
  const r = schema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      details: formatZodError(r.error),
    });
    return;
  }
  req.body = r.data;
  next();
}

export function updateProfileBasicValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileBasicSchema, req, res, next);
}

export function updateProfileSocialValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileSocialSchema, req, res, next);
}

export function updateProfileWorkValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileWorkSchema, req, res, next);
}

export function updateProfileEducationValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileEducationSchema, req, res, next);
}

export function updateProfileCertificationsValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileCertificationsSchema, req, res, next);
}

export function updateProfileProjectsValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileProjectsSchema, req, res, next);
}

export function updateProfileSetupValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileSetupSchema, req, res, next);
}

export function updateProfileStackValidation(req: Request, res: Response, next: NextFunction): void {
  sectionValidation(updateProfileStackSchema, req, res, next);
}

function paramSection(req: Request): string | undefined {
  const raw = req.params.section;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' ? s : undefined;
}

/** Dispatches the correct Zod schema for `PATCH /auth/profile/:section`. */
export function updateProfileSectionBodyValidation(req: Request, res: Response, next: NextFunction): void {
  const s = paramSection(req);
  if (!s || !isProfileUpdateSection(s)) {
    res.status(400).json({
      success: false,
      code: 'INVALID_SECTION',
      message: 'Unknown profile section',
    });
    return;
  }
  switch (s) {
    case 'basic':
      return updateProfileBasicValidation(req, res, next);
    case 'social':
      return updateProfileSocialValidation(req, res, next);
    case 'stack':
      return updateProfileStackValidation(req, res, next);
    case 'work':
      return updateProfileWorkValidation(req, res, next);
    case 'education':
      return updateProfileEducationValidation(req, res, next);
    case 'certifications':
      return updateProfileCertificationsValidation(req, res, next);
    case 'projects':
      return updateProfileProjectsValidation(req, res, next);
    case 'setup':
      return updateProfileSetupValidation(req, res, next);
    default:
      res.status(400).json({
        success: false,
        code: 'INVALID_SECTION',
        message: 'Unknown profile section',
      });
  }
}
