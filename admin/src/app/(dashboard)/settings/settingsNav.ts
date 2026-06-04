import type { SvgIconComponent } from '@mui/icons-material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

export type SettingsNavItem = {
  label: string;
  description: string;
  href: string;
  Icon: SvgIconComponent;
};

export const settingsNav: SettingsNavItem[] = [
  {
    label: 'Profile',
    description: 'Operator identity, session context, and federation',
    href: '/settings/profile',
    Icon: PersonOutlineRoundedIcon,
  },
  {
    label: 'Security',
    description: 'Sessions, devices, and passkeys',
    href: '/settings/security',
    Icon: SecurityRoundedIcon,
  },
  {
    label: 'IAM metrics',
    description: 'Platform identity health indicators',
    href: '/settings/iam-metrics',
    Icon: InsightsRoundedIcon,
  },
  {
    label: 'Temporal elevations',
    description: 'Short-lived permission grants',
    href: '/settings/elevations',
    Icon: KeyRoundedIcon,
  },
];

export function settingsTitleForPath(pathname: string): string {
  const hit = settingsNav.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return hit?.label ?? 'Settings';
}
