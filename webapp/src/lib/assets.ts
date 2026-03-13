/**
 * Central asset paths for use across the app.
 * All paths are relative to the public folder (e.g. /developers/...).
 */

const DEVELOPERS_BASE = '/developers';

export const developerImages = {
  somya: `${DEVELOPERS_BASE}/somya.png`,
  harshit: `${DEVELOPERS_BASE}/harshit.png`,
  vijay: `${DEVELOPERS_BASE}/vijay.png`,
} as const;

export const DEVELOPERS = [
  { name: 'Somya', role: 'AI Engineer', img: developerImages.somya },
  { name: 'Harshit', role: 'Tech Lead · Full Stack · DB · API · DevOps', img: developerImages.harshit },
  { name: 'Vijay', role: 'UI/UX Designer', img: developerImages.vijay },
] as const;
