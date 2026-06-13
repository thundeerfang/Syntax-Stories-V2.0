/**
 * Static public asset paths (developer portraits under /public/developers).
 * About page team roster references these via `aboutPage.seed.ts`.
 */

const DEVELOPERS_BASE = '/developers';

export const developerImages = {
  somya: `${DEVELOPERS_BASE}/somya.png`,
  harshit: `${DEVELOPERS_BASE}/harshit.png`,
  vijay: `${DEVELOPERS_BASE}/vijay.png`,
} as const;
