import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  CircleHelp,
  CreditCard,
  Globe,
  Key,
  Layers,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  Receipt,
  Settings,
  Shield,
  Smile,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react';

export const HELP_ICON_KEYS = [
  'circle-help',
  'sparkles',
  'smile',
  'layers',
  'credit-card',
  'user-plus',
  'receipt',
  'mail',
  'message-circle',
  'life-buoy',
  'book-open',
  'shield',
  'settings',
  'bell',
  'key',
  'lock',
  'globe',
  'zap',
] as const;

export type HelpIconKey = (typeof HELP_ICON_KEYS)[number];

export const DEFAULT_HELP_ICON: HelpIconKey = 'circle-help';

export const HELP_ICON_LABELS: Record<HelpIconKey, string> = {
  'circle-help': 'Help',
  sparkles: 'Sparkles',
  smile: 'Smile',
  layers: 'Layers',
  'credit-card': 'Billing',
  'user-plus': 'Account',
  receipt: 'Receipt',
  mail: 'Mail',
  'message-circle': 'Messages',
  'life-buoy': 'Support',
  'book-open': 'Guides',
  shield: 'Security',
  settings: 'Settings',
  bell: 'Notifications',
  key: 'Keys',
  lock: 'Privacy',
  globe: 'Global',
  zap: 'Quick tips',
};

const ICON_MAP: Record<HelpIconKey, LucideIcon> = {
  'circle-help': CircleHelp,
  sparkles: Sparkles,
  smile: Smile,
  layers: Layers,
  'credit-card': CreditCard,
  'user-plus': UserPlus,
  receipt: Receipt,
  mail: Mail,
  'message-circle': MessageCircle,
  'life-buoy': LifeBuoy,
  'book-open': BookOpen,
  shield: Shield,
  settings: Settings,
  bell: Bell,
  key: Key,
  lock: Lock,
  globe: Globe,
  zap: Zap,
};

export function normalizeHelpIcon(raw: string | undefined | null): HelpIconKey {
  const key = (raw ?? '').trim().toLowerCase();
  if ((HELP_ICON_KEYS as readonly string[]).includes(key)) {
    return key as HelpIconKey;
  }
  return DEFAULT_HELP_ICON;
}

export function HelpLucideIcon({
  name,
  className,
}: Readonly<{ name: string | undefined | null; className?: string }>) {
  const Icon = ICON_MAP[normalizeHelpIcon(name)];
  return <Icon className={className} aria-hidden />;
}
