import { env } from '../config/env';
import { onAppEvent } from '../shared/events/appEvents';
import { registerProfileAuditListener } from '../modules/profile/profile.audit.listener';

/**
 * Subscribe to in-process domain events (metrics, future side effects). Keep listeners fast.
 */
export function registerAppListeners(): void {
  registerProfileAuditListener();

  onAppEvent('auth.signin.success', (payload) => {
    if (env.NODE_ENV !== 'production') {
      console.info('[event] auth.signin.success', payload);
    }
  });
}
