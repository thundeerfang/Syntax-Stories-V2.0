/** Legal / product links used in footer, contact, and marketing surfaces. */
export const LEGAL_FOOTER_LINKS = [
  { href: '/terms', label: 'Terms.txt' },
  { href: '/privacy', label: 'Privacy.txt' },
  { href: '/user-data-deletion', label: 'UDD.txt' },
] as const;

export const PRODUCT_SITE_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/invite', label: 'Invite program' },
] as const;

export const CONTACT_TOPIC_SUGGESTIONS = [
  'Partnership',
  'Billing',
  'Feature Request',
  'Bug Report',
] as const;
