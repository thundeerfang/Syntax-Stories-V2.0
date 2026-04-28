import { env } from '../config/env.js';
import { onAppEvent } from '../shared/events/appEvents.js';
import { registerProfileAuditListener } from '../modules/profile/profile.audit.listener.js';
/**
 * Subscribe to in-process domain events (metrics, future side effects). Keep listeners fast.
 */
export function registerAppListeners() {
    registerProfileAuditListener();
    onAppEvent('auth.signin.success', (payload) => {
        if (env.NODE_ENV !== 'production') {
            console.info('[event] auth.signin.success', payload);
        }
    });
}
//# sourceMappingURL=registerAppListeners.js.map