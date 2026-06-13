/** Default idle window (overridden by backend `sessionIdle.idleLimitSeconds`). */
export const ADMIN_IDLE_STEP_UP_MS = 60 * 60 * 1000;

/** Default grace window (overridden by backend `sessionIdle.graceLimitSeconds`). */
export const ADMIN_STEP_UP_GRACE_MS = 10 * 60 * 1000;

export function formatSessionCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
