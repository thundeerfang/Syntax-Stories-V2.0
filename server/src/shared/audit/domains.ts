/** Consolidated audit log domains — single `audit_logs` collection. */

export const AUDIT_DOMAINS = ['core', 'billing', 'notification', 'achievement'] as const;
export type AuditDomain = (typeof AUDIT_DOMAINS)[number];

export const NotificationAuditAction = {
  CREATED: 'notification.created',
  WEBHOOK_SENT: 'notification.webhook.sent',
  WEBHOOK_FAILED: 'notification.webhook.failed',
  WEBHOOK_SKIPPED: 'notification.webhook.skipped',
  REALTIME_PUBLISHED: 'notification.realtime.published',
} as const;

export type NotificationAuditActionName =
  (typeof NotificationAuditAction)[keyof typeof NotificationAuditAction];

export const NOTIFICATION_AUDIT_ACTIONS = Object.values(NotificationAuditAction);

export type AchievementAuditAction =
  | 'achievement.unlocked'
  | 'achievement.progress_updated'
  | 'achievement.revoked'
  | 'achievement.validation_blocked';

export function billingAuditAction(action: string): string {
  return action.startsWith('billing.') ? action : `billing.${action}`;
}

export function achievementAuditAction(
  action: 'unlocked' | 'progress_updated' | 'revoked' | 'validation_blocked'
): AchievementAuditAction {
  return `achievement.${action}` as AchievementAuditAction;
}

/** Incoming gamification trigger before engine evaluation (`achievement.event.*`). */
export function achievementEventAction(eventType: string): string {
  return `achievement.event.${eventType}`;
}

/** 90-day TTL for high-volume achievement ingest rows (matches legacy `achievementeventlogs`). */
export { ACHIEVEMENT_EVENT_LOG_TTL_SEC } from '../../variable/constants.js';
