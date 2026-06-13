/** Matches server `authValidation` / User schema for profile URLs */

export const PROFILE_PORTFOLIO_URL_MAX = 500;
/** Documented minimum when the field is non-empty (not enforced as HTML minLength — optional fields) */
export const PROFILE_PORTFOLIO_URL_MIN = 4;

export const PROFILE_SOCIAL_URL_MAX = 500;
export const PROFILE_SOCIAL_URL_MIN = 4;

/** Instagram stored as plain handle or URL — server max 200 */
export const PROFILE_INSTAGRAM_MAX = 200;

/** `stackAndTools` item length — Joi `string().max(80)` */
export const STACK_TOOL_NAME_MAX = 80;
export const STACK_TOOL_NAME_MIN = 1;
