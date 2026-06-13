/**
 * Static public asset paths (developer portraits live under /public/developers).
 * Team roster is served from CMS: GET /api/marketing/about
 */

const DEVELOPERS_BASE = '/developers';

export const developerImages = {
  somya: `${DEVELOPERS_BASE}/somya.png`,
  harshit: `${DEVELOPERS_BASE}/harshit.png`,
  vijay: `${DEVELOPERS_BASE}/vijay.png`,
} as const;
