import { env } from '../config/env.js';
import { onAppEvent } from '../shared/events/appEvents.js';
import { registerProfileAuditListener } from '../modules/profile/profile.audit.listener.js';
import { registerNotificationListeners } from '../services/notifications/notification.listener.js';
import { registerAchievementListener } from '../achievements/achievement.listener.js';

/**
 * Subscribe to in-process domain events (metrics, future side effects). Keep listeners fast.
 */
export function registerAppListeners(): void {
  registerProfileAuditListener();
  registerNotificationListeners();
  registerAchievementListener();

  onAppEvent('auth.signin.success', (payload) => {
    if (env.NODE_ENV !== 'production') {
      console.info('[event] auth.signin.success', payload);
    }
  });
}
