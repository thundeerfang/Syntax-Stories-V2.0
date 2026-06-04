/** Minimum wall time between VIEW_START and VIEW_COMMIT (server-enforced). */
export const MIN_READ_COMMIT_DWELL_MS = 10_000;

export const READ_VIEW_SESSION_TTL_SEC = 1800;

/** Mobile-safe retry window (BLOG_READ_STREAK.md F.1). */
export const READ_VIEW_ACK_TTL_SEC = 1800;
