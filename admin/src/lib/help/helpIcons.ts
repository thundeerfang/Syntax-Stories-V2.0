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

export function normalizeHelpIconKey(raw: string | undefined | null): HelpIconKey {
  const key = (raw ?? '').trim().toLowerCase();
  if ((HELP_ICON_KEYS as readonly string[]).includes(key)) {
    return key as HelpIconKey;
  }
  return DEFAULT_HELP_ICON;
}

export const HELP_ICON_LABELS: Record<HelpIconKey, string> = {
  'circle-help': 'Help circle',
  sparkles: 'Sparkles',
  smile: 'Smile',
  layers: 'Layers',
  'credit-card': 'Credit card',
  'user-plus': 'User plus',
  receipt: 'Receipt',
  mail: 'Mail',
  'message-circle': 'Message',
  'life-buoy': 'Life buoy',
  'book-open': 'Book',
  shield: 'Shield',
  settings: 'Settings',
  bell: 'Bell',
  key: 'Key',
  lock: 'Lock',
  globe: 'Globe',
  zap: 'Zap',
};

export const HELP_ICON_OPTIONS = HELP_ICON_KEYS.map((key) => ({
  value: key,
  label: HELP_ICON_LABELS[key],
}));
