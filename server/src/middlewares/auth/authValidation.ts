import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const altchaField = Joi.alternatives().try(Joi.string().max(20000), Joi.object()).optional();

const sendOtpSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  altcha: altchaField,
});

const signupEmailSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  altcha: altchaField,
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  code: Joi.string()
    .required()
    .custom((value, helpers) => {
      const digits = String(value).replace(/\D/g, '').slice(0, 6);
      if (digits.length !== 6) {
        return helpers.error('any.custom', {
          message: 'Code must be exactly 6 digits.',
        });
      }
      return digits;
    }, 'otp-digits'),
  otpVersion: Joi.number().integer().min(1).optional(),
}).messages({ 'any.custom': '{{#message}}' });

function isMonthYear(val: unknown): val is string {
  return typeof val === 'string' && /^\d{4}-\d{2}$/.test(val);
}

function compareMonthYear(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1; // lexical works for YYYY-MM
}

function safeMonthYear(val: unknown): string {
  if (!isMonthYear(val)) return '';
  const [yStr, mStr] = val.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return '';
  const maxYear = new Date().getFullYear();
  if (y < 1980 || y > maxYear) return '';
  if (m < 1 || m > 12) return '';
  return val;
}

const workExperienceItem = Joi.object({
  workId: Joi.string().max(20).allow('').trim(),
  jobTitle: Joi.string().max(120).required().trim(),
  employmentType: Joi.string().max(50).required().trim(),
  company: Joi.string().max(200).required().trim(),
  companyDomain: Joi.string().max(120).allow('').trim(),
  companyLogo: Joi.string().uri().max(500).allow('').trim(),
  currentPosition: Joi.boolean(),
  startDate: Joi.string().max(20).required().trim(),
  endDate: Joi.when(Joi.ref('currentPosition'), {
    is: false,
    then: Joi.string().max(20).required().trim(),
    otherwise: Joi.string().max(20).allow('', null).optional(),
  }),
  location: Joi.string().max(180).allow('').trim(),
  locationType: Joi.string().max(20).required().trim(),
  description: Joi.string().max(5000).allow('').trim(),
  skills: Joi.array().items(Joi.string().max(80).trim()).min(1).max(10),
  promotions: Joi.array().items(Joi.object({
    jobTitle: Joi.string().max(120).required().trim(),
    startDate: Joi.string().max(20).allow('').trim(),
    endDate: Joi.string().max(20).allow('').trim(),
    currentPosition: Joi.boolean().optional(),
    media: Joi.array().items(Joi.object({
      url: Joi.string().uri().max(500).required().trim(),
      title: Joi.string().max(120).allow('').trim(),
      altText: Joi.string().max(200).allow('').trim(),
    })).max(5).optional(),
  })).max(5).optional(),
  mediaUrls: Joi.array().items(Joi.string().uri().max(500)).max(5),
  media: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().max(500).required().trim(),
      title: Joi.string().max(120).allow('').trim(),
      altText: Joi.string().max(200).allow('').trim(),
    })
  ).max(5),
}).custom((value, helpers) => {
  const start = safeMonthYear(value?.startDate);
  const end = value?.currentPosition ? '' : safeMonthYear(value?.endDate);
  if (start && end && compareMonthYear(end, start) < 0) {
    return helpers.error('any.custom', { message: 'Work experience end date cannot be earlier than start date.' });
  }

  const promosRaw = Array.isArray(value?.promotions) ? value.promotions : [];
  const promos = promosRaw.filter((p: any) => p && typeof p.jobTitle === 'string' && p.jobTitle.trim());

  // If there are multiple promotions, earlier ones must have an endDate (can't be "Present").
  for (let i = 0; i < promos.length - 1; i++) {
    const pe = safeMonthYear(promos[i]?.endDate);
    if (!pe) return helpers.error('any.custom', { message: `Promotion ${i + 1} must have an end date when a later promotion exists.` });
  }

  for (let i = 0; i < promos.length; i++) {
    const ps = safeMonthYear(promos[i]?.startDate);
    const pe = safeMonthYear(promos[i]?.endDate);

    if (start && ps && compareMonthYear(ps, start) < 0) {
      return helpers.error('any.custom', { message: `Promotion ${i + 1} start date cannot be earlier than the job start date.` });
    }
    if (ps && pe && compareMonthYear(pe, ps) < 0) {
      return helpers.error('any.custom', { message: `Promotion ${i + 1} end date cannot be earlier than its start date.` });
    }
    if (end) {
      if (ps && compareMonthYear(ps, end) > 0) {
        return helpers.error('any.custom', { message: `Promotion ${i + 1} start date cannot be after the job end date.` });
      }
      if (pe && compareMonthYear(pe, end) > 0) {
        return helpers.error('any.custom', { message: `Promotion ${i + 1} end date cannot be after the job end date.` });
      }
    }
  }

  // When not current, job end must be >= latest promotion end (if any).
  if (end) {
    const latestPromoEnd = promos
      .map((p: any) => safeMonthYear(p?.endDate))
      .filter(Boolean)
      .sort()
      .pop();
    if (latestPromoEnd && compareMonthYear(end, latestPromoEnd) < 0) {
      return helpers.error('any.custom', { message: 'Employment end date must be on/after the last promotion end date.' });
    }
  }

  return value;
}).messages({ 'any.custom': '{{#message}}' });

const educationItem = Joi.object({
  eduId: Joi.string().max(20).allow('').trim(),
  school: Joi.string().max(200).required().trim(),
  schoolDomain: Joi.string().max(120).allow('').trim(),
  schoolLogo: Joi.string().uri().allow('').trim().max(2000),
  degree: Joi.string().max(80).required().trim(),
  fieldOfStudy: Joi.string().max(120).allow('').trim(),
  currentEducation: Joi.boolean(),
  startDate: Joi.string().max(20).required().trim(),
  endDate: Joi.when(Joi.ref('currentEducation'), {
    is: false,
    then: Joi.string().max(20).required().trim(),
    otherwise: Joi.string().max(20).allow('', null).optional(),
  }),
  grade: Joi.string().max(80).allow('').trim(),
  description: Joi.string().max(2000).allow('').trim(),
  activity: Joi.string().max(500).allow('').trim(),
  refCode: Joi.string().max(40).allow('').trim(),
});

const certificationItem = Joi.object({
  certId: Joi.string().max(20).allow('').trim(),
  name: Joi.string().max(120).required().trim(),
  issuingOrganization: Joi.string().max(120).required().trim(),
  issuerLogo: Joi.string().uri().allow('').trim().max(2000),
  currentlyValid: Joi.boolean(),
  issueDate: Joi.string().max(20).required().trim(),
  expirationDate: Joi.string().max(20).allow('').trim(),
  certValType: Joi.string().max(20).allow('').trim(),
  credentialId: Joi.string().max(80).allow('').trim(),
  credentialUrl: Joi.string().uri().allow('').trim().max(500),
  description: Joi.string().max(2000).allow('').trim(),
  skills: Joi.array().items(Joi.string().max(80).trim()).min(1).max(30),
  media: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().max(500).required().trim(),
      title: Joi.string().max(120).allow('').trim(),
      altText: Joi.string().max(200).allow('').trim(),
    })
  ).max(5),
});

const projectItem = Joi.object({
  type: Joi.string().valid('project', 'publication').default('project'),
  source: Joi.string().valid('github').allow('').trim(),
  repoFullName: Joi.string().max(200).allow('').trim(),
  repoId: Joi.number().integer(),
  title: Joi.string().max(120).required().trim(),
  publisher: Joi.when(Joi.ref('source'), {
    is: 'github',
    then: Joi.string().max(120).allow('').trim(),
    otherwise: Joi.string().max(120).required().trim(),
  }),
  ongoing: Joi.boolean(),
  publicationDate: Joi.when(Joi.ref('source'), {
    is: 'github',
    then: Joi.string().max(20).allow('').trim(),
    otherwise: Joi.string().max(20).required().trim(),
  }),
  endDate: Joi.string().max(20).allow('').trim(),
  publicationUrl: Joi.string().uri().allow('').trim().max(500),
  description: Joi.string().max(2000).allow('').trim(),
  prjLog: Joi.string().max(20).allow('').trim(),
  media: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().max(500).required().trim(),
      title: Joi.string().max(120).allow('').trim(),
      altText: Joi.string().max(200).allow('').trim(),
    })
  ).max(5),
});

const openSourceItem = Joi.object({
  title: Joi.string().max(120).required().trim(),
  repository: Joi.string().max(200).allow('').trim(),
  repositoryUrl: Joi.string().uri().allow('').trim().max(500),
  active: Joi.boolean(),
  activeFrom: Joi.string().max(20).allow('').trim(),
  endDate: Joi.string().max(20).allow('').trim(),
  description: Joi.string().max(2000).allow('').trim(),
});

const setupItem = Joi.object({
  label: Joi.string().max(80).required().trim(),
  imageUrl: Joi.string().uri().max(500).required().trim(),
  productUrl: Joi.string().uri().max(500).allow('').trim(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).trim(),
  username: Joi.string().min(2).max(30).pattern(/^[a-zA-Z0-9_]+$/).trim().lowercase(),
  bio: Joi.string().max(500).allow('').trim(),
  profileImg: Joi.string().max(2000).allow('').trim(),
  coverBanner: Joi.string().max(2000).allow('').trim(),
  job: Joi.string().max(100).allow('').trim(),
  portfolioUrl: Joi.string().uri().max(500).allow('').trim(),
  linkedin: Joi.string().uri().allow('').trim(),
  instagram: Joi.string().max(200).allow('').trim(),
  github: Joi.string().uri().allow('').trim(),
  youtube: Joi.string().uri().allow('').trim(),
  stackAndTools: Joi.array().items(Joi.string().max(80)).max(10),
  workExperiences: Joi.array().items(workExperienceItem).max(5),
  education: Joi.array().items(educationItem).max(15),
  certifications: Joi.array().items(certificationItem).max(30),
  projects: Joi.array().items(projectItem).max(30).custom((value, helpers) => {
    const arr = Array.isArray(value) ? value : [];
    const githubCount = arr.filter((p: any) => String(p?.source || '').trim() === 'github').length;
    if (githubCount > 7) {
      return helpers.error('any.custom', { message: 'You can link up to 7 GitHub repositories in Open Source. Remove one to add another.' });
    }
    return value;
  }).messages({ 'any.custom': '{{#message}}' }),
  openSourceContributions: Joi.array().items(openSourceItem).max(30),
  mySetup: Joi.array().items(setupItem).max(5),
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
  const { error, value } = verifyOtpSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    const msg = error.details[0]?.message?.replace(/"/g, '') ?? 'Validation error';
    res.status(400).json({ message: msg, error: error.details, success: false });
    return;
  }
  Object.assign(req.body, value);
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
