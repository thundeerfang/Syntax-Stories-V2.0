import { onAppEvent } from '../../shared/events/appEvents.js';
import { AuditAction } from '../../shared/audit/events.js';
import { UserModel } from '../../models/User.js';
import { createNotification } from './notification.service.js';

let registered = false;

const SECTION_LABELS: Record<string, string> = {
  legacy: 'profile',
  basic: 'profile',
  'stack-tools': 'stack & tools',
  'my-setup': 'my setup',
  'work-experiences': 'work experience',
  education: 'education',
  certifications: 'certifications',
  projects: 'projects',
  'open-source': 'open source',
};

const AUDIT_TO_MESSAGE: Partial<Record<string, { title: string; message: string }>> = {
  [AuditAction.EDUCATION_ADDED]: {
    title: 'Education added',
    message: 'You added a new education entry to your profile.',
  },
  [AuditAction.EDUCATION_UPDATED]: {
    title: 'Education updated',
    message: 'You updated an education entry on your profile.',
  },
  [AuditAction.EDUCATION_REMOVED]: {
    title: 'Education removed',
    message: 'You removed an education entry from your profile.',
  },
  [AuditAction.WORK_ADDED]: {
    title: 'Work experience added',
    message: 'You added a new work experience to your profile.',
  },
  [AuditAction.WORK_UPDATED]: {
    title: 'Work experience updated',
    message: 'You updated a work experience on your profile.',
  },
  [AuditAction.WORK_REMOVED]: {
    title: 'Work experience removed',
    message: 'You removed a work experience from your profile.',
  },
  [AuditAction.PROJECT_ADDED]: {
    title: 'Project added',
    message: 'You added a new project to your profile.',
  },
  [AuditAction.PROJECT_UPDATED]: {
    title: 'Project updated',
    message: 'You updated a project on your profile.',
  },
  [AuditAction.PROJECT_REMOVED]: {
    title: 'Project removed',
    message: 'You removed a project from your profile.',
  },
  [AuditAction.CERTIFICATION_ADDED]: {
    title: 'Certification added',
    message: 'You added a certification to your profile.',
  },
  [AuditAction.CERTIFICATION_UPDATED]: {
    title: 'Certification updated',
    message: 'You updated a certification on your profile.',
  },
  [AuditAction.CERTIFICATION_REMOVED]: {
    title: 'Certification removed',
    message: 'You removed a certification from your profile.',
  },
  [AuditAction.OPEN_SOURCE_ADDED]: {
    title: 'Open source added',
    message: 'You added an open source contribution.',
  },
  [AuditAction.OPEN_SOURCE_UPDATED]: {
    title: 'Open source updated',
    message: 'You updated an open source contribution.',
  },
  [AuditAction.OPEN_SOURCE_REMOVED]: {
    title: 'Open source removed',
    message: 'You removed an open source contribution.',
  },
  [AuditAction.STACK_TOOL_ADDED]: {
    title: 'Stack tool added',
    message: 'You added a tool to your stack.',
  },
  [AuditAction.STACK_TOOL_REMOVED]: {
    title: 'Stack tool removed',
    message: 'You removed a tool from your stack.',
  },
  [AuditAction.MY_SETUP_ADDED]: {
    title: 'Setup item added',
    message: 'You added an item to My Setup.',
  },
  [AuditAction.MY_SETUP_UPDATED]: {
    title: 'Setup item updated',
    message: 'You updated an item in My Setup.',
  },
  [AuditAction.MY_SETUP_REMOVED]: {
    title: 'Setup item removed',
    message: 'You removed an item from My Setup.',
  },
  [AuditAction.PROFILE_UPDATED]: {
    title: 'Profile updated',
    message: 'Your profile settings were saved.',
  },
  [AuditAction.EMAIL_CHANGE]: {
    title: 'Email updated',
    message: 'Your account email was changed successfully.',
  },
  [AuditAction.OAUTH_CONNECTED]: {
    title: 'Account connected',
    message: 'You connected a new OAuth provider to your account.',
  },
  [AuditAction.OAUTH_DISCONNECTED]: {
    title: 'Account disconnected',
    message: 'You disconnected an OAuth provider from your account.',
  },
};

export function registerNotificationListeners(): void {
  if (registered) return;
  registered = true;

  onAppEvent('referral.converted', async (payload) => {
    const referee = await UserModel.findById(payload.refereeUserId)
      .select('username fullName')
      .lean();
    const name = referee?.fullName ?? referee?.username ?? 'Someone';
    void createNotification({
      userId: payload.referrerId,
      type: 'referral_accepted',
      title: 'Invite accepted',
      message: `${name} joined Syntax Stories using your invite.`,
      href: '/invite',
      icon: 'user-plus',
      metadata: { refereeUserId: payload.refereeUserId, source: payload.source },
    });
  });

  onAppEvent('profile.updated', (payload) => {
    const sectionLabel = SECTION_LABELS[payload.section] ?? payload.section;
    void createNotification({
      userId: payload.actorId,
      type: 'settings_update',
      title: 'Settings updated',
      message: `Your ${sectionLabel} settings were saved.`,
      href: '/settings?section=edit-profile',
      icon: 'settings',
      metadata: { section: payload.section, keys: Object.keys(payload.updates) },
    });
  });
}

/** Call from email-change controller after successful verify. */
export async function notifyEmailChange(userId: string, newEmail: string): Promise<void> {
  const tmpl = AUDIT_TO_MESSAGE[AuditAction.EMAIL_CHANGE];
  void createNotification({
    userId,
    type: 'settings_update',
    title: tmpl?.title ?? 'Email updated',
    message: tmpl?.message ?? `Your email was changed to ${newEmail}.`,
    href: '/settings?section=security-email',
    icon: 'mail',
    metadata: { newEmail },
  });
}
