import { writeAuditLog } from '../../shared/audit/auditLog.js';
import { AuditAction } from '../../shared/audit/events.js';
import { onAppEvent } from '../../shared/events/appEvents.js';
import { runProfileSectionAudits } from './profile.audit.sections.js';

let profileAuditRegistered = false;

/** Subscribe once at process startup (see `registerAppListeners`). */
export function registerProfileAuditListener(): void {
  if (profileAuditRegistered) return;
  profileAuditRegistered = true;
  onAppEvent('profile.updated', (payload) => {
    runProfileSectionAudits(payload);
    if (Object.keys(payload.updates).length > 0) {
      void writeAuditLog(payload.req, AuditAction.PROFILE_UPDATED, {
        actorId: payload.actorId,
        targetType: 'profile',
        targetId: payload.actorId,
        metadata: { keys: Object.keys(payload.updates), section: payload.section },
      });
    }
  });
}
