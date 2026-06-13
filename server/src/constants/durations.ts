/** Shared time constants — avoid scattering `7 * 24 * 60 * 60` magic numbers. */

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export const SEVEN_DAYS_MS = 7 * MS_PER_DAY;
export const SEVEN_DAYS_SEC = 7 * SECONDS_PER_DAY;
