import type { SubscriptionStatus } from "../../models/Subscription.js";
export function computeIsGraceActive(
  status: SubscriptionStatus | string,
  graceUntil: Date | null | undefined,
  now = new Date(),
): boolean {
  return status === "past_due" && !!graceUntil && graceUntil > now;
}
