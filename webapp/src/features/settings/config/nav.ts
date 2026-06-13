import type { ElementType } from 'react';
import {
  Award,
  Bell,
  CreditCard,
  Flame,
  FolderGit2,
  Github,
  Mail,
  Monitor,
  Plug,
  User,
  Wallet,
  Wrench,
} from 'lucide-react';

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: ElementType;
}

export interface SettingsNavGroup {
  heading: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    heading: 'Account',
    items: [
      { id: 'edit-profile', label: 'Edit Profile', icon: User },
      { id: 'stack-tools', label: 'Stack & Tools', icon: Monitor },
      { id: 'my-setup', label: 'My Setup', icon: Wrench },
      { id: 'certifications', label: 'License & Certifications', icon: Award },
      { id: 'projects', label: 'Projects & Publications', icon: FolderGit2 },
      { id: 'open-source', label: 'Open Source', icon: Github },
      { id: 'blog-streak', label: 'Blog read streak', icon: Flame },
    ],
  },
  {
    heading: 'Security',
    items: [
      { id: 'security-email', label: 'Update Email', icon: Mail },
      { id: 'connected-accounts', label: 'Connected Accounts', icon: Plug },
    ],
  },
  {
    heading: 'Other',
    items: [
      { id: 'syntax-card', label: 'Syntax Card', icon: CreditCard },
      { id: 'payments', label: 'Payments', icon: Wallet },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

/** Section ids with implemented content panels. */
export const SETTINGS_IMPLEMENTED_SECTION_IDS = [
  'edit-profile',
  'stack-tools',
  'my-setup',
  'certifications',
  'projects',
  'open-source',
  'blog-streak',
  'security-email',
  'connected-accounts',
  'syntax-card',
  'payments',
  'notifications',
] as const;

export type SettingsSectionId = (typeof SETTINGS_IMPLEMENTED_SECTION_IDS)[number];

export const SETTINGS_ACCORDION_VARIANTS = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
} as const;
