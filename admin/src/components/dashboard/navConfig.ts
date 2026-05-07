import type { SvgIconComponent } from '@mui/icons-material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SubscriptionsRoundedIcon from '@mui/icons-material/SubscriptionsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import ContactMailRoundedIcon from '@mui/icons-material/ContactMailRounded';

export type NavItem = {
  label: string;
  href: string;
  Icon: SvgIconComponent;
};

export const mainNav: NavItem[] = [
  { label: 'Overview', href: '/', Icon: DashboardRoundedIcon },
  { label: 'Users', href: '/users', Icon: PeopleRoundedIcon },
  { label: 'Feedback', href: '/feedbacks', Icon: RateReviewRoundedIcon },
  { label: 'Contact leads', href: '/contact-leads', Icon: ContactMailRoundedIcon },
  { label: 'Help', href: '/help', Icon: HelpOutlineRoundedIcon },
  { label: 'Soft delete', href: '/trash', Icon: DeleteOutlineRoundedIcon },
  { label: 'Documentation', href: '/documentation', Icon: MenuBookRoundedIcon },
  { label: 'Subscriptions', href: '/subscriptions', Icon: SubscriptionsRoundedIcon },
  { label: 'Transactions', href: '/transactions', Icon: ReceiptLongRoundedIcon },
];

const DOC_SUB_TITLES: Record<string, string> = {
  architecture: 'Documentation — Architecture',
  'cms-workflow': 'Documentation — CMS workflow',
  'api-contracts': 'Documentation — API',
  publishing: 'Documentation — Publishing',
};

export function titleForPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'Overview';
  if (pathname.startsWith('/documentation/')) {
    const sub = pathname.replace('/documentation/', '').split('/')[0] ?? '';
    return DOC_SUB_TITLES[sub] ?? 'Documentation';
  }
  if (pathname.startsWith('/documentation')) return 'Documentation';
  const hit = mainNav.find((n) => n.href !== '/' && pathname.startsWith(n.href));
  if (hit) return hit.label;
  if (pathname.startsWith('/help')) return 'Help';
  if (pathname.startsWith('/trash')) return 'Soft delete';
  if (pathname.startsWith('/users')) return 'Users';
  if (pathname.startsWith('/feedbacks')) return 'Feedback';
  if (pathname.startsWith('/contact-leads')) return 'Contact leads';
  return 'Admin';
}
