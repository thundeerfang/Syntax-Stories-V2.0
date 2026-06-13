import type { SvgIconComponent } from '@mui/icons-material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import SubscriptionsRoundedIcon from '@mui/icons-material/SubscriptionsRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import ContactMailRoundedIcon from '@mui/icons-material/ContactMailRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import MiscellaneousServicesRoundedIcon from '@mui/icons-material/MiscellaneousServicesRounded';

export type NavItem = {
  label: string;
  href: string;
  Icon: SvgIconComponent;
  /** When set, nav item is hidden unless the user has this permission (Phase 1 RBAC nav). */
  permission?: string;
  /** When set, nav item is shown if the user has any listed permission. */
  anyPermissions?: string[];
  /** When true, show for any staff even without `permission`. */
  staffOnly?: boolean;
};

export type NavGroup = {
  type: 'group';
  id: string;
  label: string;
  Icon: SvgIconComponent;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'type' in entry && entry.type === 'group';
}

export const mainNav: NavEntry[] = [
  { label: 'Overview', href: '/', Icon: DashboardRoundedIcon, staffOnly: true },
  { label: 'Users', href: '/users', Icon: PeopleRoundedIcon, permission: 'user:list' },
  {
    type: 'group',
    id: 'blogs',
    label: 'Blogs',
    Icon: ArticleRoundedIcon,
    children: [
      { label: 'All blogs', href: '/blogs', Icon: ArticleRoundedIcon, permission: 'blog:list' },
      {
        label: 'Categories',
        href: '/categories',
        Icon: FolderRoundedIcon,
        permission: 'blog_category:list',
      },
      { label: 'Tags', href: '/tags', Icon: LabelRoundedIcon, permission: 'blog_tag:list' },
    ],
  },
  {
    type: 'group',
    id: 'services',
    label: 'Services',
    Icon: MiscellaneousServicesRoundedIcon,
    children: [
      { label: 'Legal', href: '/legal', Icon: GavelRoundedIcon, permission: 'legal:manage' },
      {
        label: 'Feedback',
        href: '/feedbacks',
        Icon: RateReviewRoundedIcon,
        permission: 'feedback:read',
      },
      {
        label: 'Contact leads',
        href: '/contact-leads',
        Icon: ContactMailRoundedIcon,
        permission: 'contact_lead:read',
      },
      { label: 'Audit log', href: '/audit', Icon: HistoryRoundedIcon, permission: 'audit:read' },
      {
        label: 'Notifications',
        href: '/notifications',
        Icon: NotificationsActiveRoundedIcon,
        permission: 'notification:manage',
      },
      {
        label: 'Soft delete',
        href: '/trash',
        Icon: DeleteOutlineRoundedIcon,
        permission: 'trash:manage',
      },
    ],
  },
  {
    label: 'Subscriptions',
    href: '/subscriptions',
    Icon: SubscriptionsRoundedIcon,
    permission: 'billing:read_subscription',
  },
  {
    label: 'Achievements',
    href: '/achievements',
    Icon: EmojiEventsRoundedIcon,
    staffOnly: true,
    anyPermissions: ['achievement:list', 'achievement:manage'],
  },
];

function canSeeNavItem(
  item: NavItem,
  hasPermission: (key: string) => boolean,
  permissionsLoaded: boolean
): boolean {
  if (!permissionsLoaded) return true;
  if (item.staffOnly) return true;
  if (item.anyPermissions?.length) {
    return item.anyPermissions.some((p) => hasPermission(p));
  }
  if (!item.permission) return true;
  return hasPermission(item.permission);
}

export function filterNavByPermissions(
  entries: NavEntry[],
  hasPermission: (key: string) => boolean,
  permissionsLoaded: boolean
): NavEntry[] {
  if (!permissionsLoaded) return entries;

  return entries
    .map((entry) => {
      if (!isNavGroup(entry)) {
        return canSeeNavItem(entry, hasPermission, permissionsLoaded) ? entry : null;
      }
      const children = entry.children.filter((child) =>
        canSeeNavItem(child, hasPermission, permissionsLoaded)
      );
      if (children.length === 0) return null;
      return { ...entry, children };
    })
    .filter((e): e is NavEntry => e !== null);
}

/** Flat list of routable nav items (for page titles and search). */
export function flattenNavItems(entries: NavEntry[]): NavItem[] {
  const out: NavItem[] = [];
  for (const entry of entries) {
    if (isNavGroup(entry)) out.push(...entry.children);
    else out.push(entry);
  }
  return out;
}

export function titleForPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'Overview';
  const items = flattenNavItems(mainNav);
  const hit = items.find((n) => n.href !== '/' && pathname.startsWith(n.href));
  if (hit) return hit.label;
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/security')) return 'Settings';
  return 'Admin';
}

/** Group id if pathname is under that group's children. */
export function navGroupIdForPath(pathname: string): string | null {
  for (const entry of mainNav) {
    if (!isNavGroup(entry)) continue;
    if (entry.children.some((c) => c.href !== '/' && pathname.startsWith(c.href))) {
      return entry.id;
    }
  }
  return null;
}
