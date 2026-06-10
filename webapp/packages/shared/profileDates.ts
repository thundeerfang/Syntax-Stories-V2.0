/** Earliest year allowed for profile month-year fields (work, education, certifications). */
export const PROFILE_DATE_START_YEAR = 1980;

/** Latest year allowed for certification expiration dates (licenses often expire years ahead). */
export const PROFILE_CERT_EXPIRATION_END_YEAR = 2050;

/** Latest year for issue/start/end dates tied to past or present events (not cert expiration). */
export function profileDateEndYear(now = new Date()): number {
  return now.getFullYear();
}
