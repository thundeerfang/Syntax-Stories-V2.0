import { env } from '../config/env';
import { onAppEvent } from '../shared/events/appEvents';

/**
 * Subscribe to in-process domain events (metrics, future side effects). Keep listeners fast.
 */
export function registerAppListeners(): void {
  onAppEvent('auth.signin.success', (payload) => {
    if (env.NODE_ENV !== 'production') {
      console.info('[event] auth.signin.success', payload);
    }
  });
}
