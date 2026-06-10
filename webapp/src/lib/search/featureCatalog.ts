/** Keep in sync with `server/src/services/search/featureCatalog.ts`. */
export type FeatureCatalogEntry = {
  id: string;
  label: string;
  keywords: readonly string[];
  href: string;
};

export const SEARCH_FEATURES: readonly FeatureCatalogEntry[] = [
  { id: 'home', label: 'Home feed', keywords: ['home', 'feed'], href: '/' },
  { id: 'explore', label: 'Explore', keywords: ['explore', 'discover'], href: '/explore' },
  { id: 'trending', label: 'Trending', keywords: ['trending', 'hot'], href: '/trending' },
  {
    id: 'topics',
    label: 'Browse topics',
    keywords: ['topics', 'tags', 'categories'],
    href: '/topics',
  },
  { id: 'following', label: 'Following feed', keywords: ['following'], href: '/following' },
  { id: 'bookmarks', label: 'Bookmarks', keywords: ['bookmarks', 'saved'], href: '/bookmarks' },
  { id: 'reposts', label: 'Reposts', keywords: ['reposts'], href: '/reposts' },
  { id: 'squads', label: 'Browse squads', keywords: ['squads', 'communities'], href: '/squads' },
  { id: 'write', label: 'Write a story', keywords: ['write', 'blog', 'publish'], href: '/blogs/write' },
  {
    id: 'achievements',
    label: 'Achievements',
    keywords: ['achievements', 'badges', 'xp'],
    href: '/achievements',
  },
  { id: 'invite', label: 'Invite friends', keywords: ['invite', 'referral'], href: '/invite' },
  { id: 'settings', label: 'Settings', keywords: ['settings', 'account'], href: '/settings' },
  { id: 'wallet', label: 'Wallet', keywords: ['wallet', 'credits'], href: '/wallet' },
  { id: 'pricing', label: 'Pricing', keywords: ['pricing', 'plans'], href: '/pricing' },
] as const;

export function filterFeatureCatalog(q: string, limit = 8) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: Array<{ id: string; label: string; href: string }> = [];
  for (const f of SEARCH_FEATURES) {
    const hay = [f.label, ...f.keywords].join(' ').toLowerCase();
    if (hay.includes(needle) || f.label.toLowerCase().includes(needle)) {
      hits.push({ id: f.id, label: f.label, href: f.href });
    }
    if (hits.length >= limit) break;
  }
  return hits;
}
