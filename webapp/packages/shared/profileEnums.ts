import { z } from 'zod';

/** Allowed employment types for work experience (settings + server validation). */
export const EMPLOYMENT_TYPE_VALUES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
  'Volunteer',
  'Self-employed',
  'Temporary',
  'Other',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPE_VALUES)[number];

export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPE_VALUES);

export const EMPLOYMENT_TYPE_OPTIONS = EMPLOYMENT_TYPE_VALUES.map((label) => ({
  value: label,
  label,
}));

/** Work arrangement for a role (on-site / remote / hybrid). */
export const LOCATION_TYPE_VALUES = ['On-site', 'Remote', 'Hybrid'] as const;

export type LocationType = (typeof LOCATION_TYPE_VALUES)[number];

export const locationTypeSchema = z.enum(LOCATION_TYPE_VALUES);

export const LOCATION_TYPE_SELECT_OPTIONS = [
  { value: '', label: 'Select work arrangement *' },
  ...LOCATION_TYPE_VALUES.map((value) => ({ value, label: value })),
] as const;
