/** Mirrors server `SQUAD_CATEGORY_VALUES` — public squads only. */
export const SQUAD_CATEGORIES = [
  'languages',
  'web',
  'ai',
  'devops',
  'mobile',
  'game',
  'career',
  'open_source',
  'devrel',
  'devtools',
] as const;

export type SquadCategory = (typeof SQUAD_CATEGORIES)[number];

export function isSquadCategory(raw: string): raw is SquadCategory {
  return (SQUAD_CATEGORIES as readonly string[]).includes(raw);
}

export const SQUAD_CATEGORY_LABEL: Record<SquadCategory, string> = {
  languages: 'Languages',
  web: 'Web',
  ai: 'AI',
  devops: 'DevOps',
  mobile: 'Mobile',
  game: 'Game',
  career: 'Career',
  open_source: 'Open source',
  devrel: 'DevRel',
  devtools: 'DevTools',
};

export function squadCategoryLabel(c: SquadCategory | string | undefined): string {
  if (!c) return '';
  return SQUAD_CATEGORY_LABEL[c as SquadCategory] ?? c;
}
