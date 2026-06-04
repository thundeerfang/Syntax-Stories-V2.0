/**
 * Webhook / heartbeat JSON APIs (no auth).
 */

export type OperationalPingResult =
  | { ok: true; latencyMs: number; service: string; t: string }
  | { ok: false; latencyMs?: number; error: string };

export interface SessionPingResponse {
  ok: boolean;
  userId?: string;
}
