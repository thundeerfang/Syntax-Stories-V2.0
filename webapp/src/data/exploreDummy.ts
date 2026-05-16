/**
 * Temporary mock data for `/explore` UI. Replace with API-driven content later.
 */

export type DummySquad = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  /** Used to group sections (e.g. Languages, Web). */
  section: 'languages' | 'web' | 'mobile' | 'devops';
  emoji: string;
}>;

export type DummyTag = Readonly<{
  slug: string;
  name: string;
  postCount: number;
}>;

export type DummyCategory = Readonly<{
  slug: string;
  name: string;
  postCount: number;
  blurb: string;
}>;

export type DummyPost = Readonly<{
  id: string;
  title: string;
  excerpt: string;
  author: string;
  tagSlug: string;
  categorySlug: string;
  respectCount: number;
}>;

export type ExploreTrailItem =
  | Readonly<{ kind: 'squad'; squad: DummySquad }>
  | Readonly<{ kind: 'tag'; tag: DummyTag }>
  | Readonly<{ kind: 'category'; category: DummyCategory }>;

export const DUMMY_SQUADS: DummySquad[] = [
  {
    id: '1',
    slug: 'nodejs-developers',
    name: 'Node.js Developers',
    description: 'Runtime, tooling, and production Node patterns.',
    memberCount: 12840,
    section: 'languages',
    emoji: '🟢',
  },
  {
    id: '2',
    slug: 'rustaceans',
    name: 'Rustaceans',
    description: 'Systems, safety, and fearless concurrency.',
    memberCount: 9021,
    section: 'languages',
    emoji: '🦀',
  },
  {
    id: '3',
    slug: 'python-data',
    name: 'Python & Data',
    description: 'Notebooks, pipelines, and ML ergonomics.',
    memberCount: 15400,
    section: 'languages',
    emoji: '🐍',
  },
  {
    id: '4',
    slug: 'frontend-guild',
    name: 'Frontend Guild',
    description: 'React, CSS architecture, and a11y craft.',
    memberCount: 22100,
    section: 'web',
    emoji: '⚛️',
  },
  {
    id: '5',
    slug: 'fullstack-lounge',
    name: 'Fullstack Lounge',
    description: 'APIs, SSR, and the glue between stacks.',
    memberCount: 9800,
    section: 'web',
    emoji: '🔀',
  },
  {
    id: '6',
    slug: 'mobile-craft',
    name: 'Mobile Craft',
    description: 'Flutter, native, and gesture-first UX.',
    memberCount: 7600,
    section: 'mobile',
    emoji: '📱',
  },
  {
    id: '7',
    slug: 'ship-it-devops',
    name: 'Ship It DevOps',
    description: 'CI/CD, k8s, and calm on-call culture.',
    memberCount: 11200,
    section: 'devops',
    emoji: '🚀',
  },
];

export const DUMMY_TAGS: DummyTag[] = [
  { slug: 'typescript', name: 'TypeScript', postCount: 4200 },
  { slug: 'react', name: 'React', postCount: 9100 },
  { slug: 'nextjs', name: 'Next.js', postCount: 5400 },
  { slug: 'graphql', name: 'GraphQL', postCount: 2100 },
  { slug: 'postgres', name: 'Postgres', postCount: 3800 },
  { slug: 'tailwind', name: 'Tailwind', postCount: 6200 },
  { slug: 'rust', name: 'Rust', postCount: 2900 },
  { slug: 'swift', name: 'Swift', postCount: 1800 },
  { slug: 'kubernetes', name: 'Kubernetes', postCount: 1600 },
  { slug: 'ai', name: 'AI', postCount: 12000 },
  { slug: 'webassembly', name: 'WebAssembly', postCount: 900 },
  { slug: 'css', name: 'CSS', postCount: 4500 },
];

export const DUMMY_CATEGORIES: DummyCategory[] = [
  { slug: 'web-dev', name: 'Web Development', postCount: 18200, blurb: 'Browsers, frameworks, and shipping UI.' },
  { slug: 'backend', name: 'Backend', postCount: 12400, blurb: 'Services, data, and scale.' },
  { slug: 'devops', name: 'DevOps', postCount: 8900, blurb: 'Automation and reliability.' },
  { slug: 'mobile', name: 'Mobile', postCount: 6700, blurb: 'iOS, Android, cross-platform.' },
  { slug: 'career', name: 'Career', postCount: 5100, blurb: 'Interviews, growth, and teams.' },
  { slug: 'open-source', name: 'Open Source', postCount: 4300, blurb: 'Licenses, communities, maintainers.' },
];

export const DUMMY_POSTS: DummyPost[] = [
  {
    id: 'p1',
    title: 'Why we moved our edge layer to Rust',
    excerpt: 'Latency budgets, memory safety, and one surprise win in CI.',
    author: 'nina.codes',
    tagSlug: 'rust',
    categorySlug: 'backend',
    respectCount: 428,
  },
  {
    id: 'p2',
    title: 'Design tokens that survive dark mode',
    excerpt: 'A retro-compatible pipeline from Figma to Tailwind v4.',
    author: 'alex.rivera',
    tagSlug: 'css',
    categorySlug: 'web-dev',
    respectCount: 312,
  },
  {
    id: 'p3',
    title: 'Shipping squads at Syntax Stories',
    excerpt: 'Feeds, pins, and moderation without losing the small-team vibe.',
    author: 'syntax.team',
    tagSlug: 'nextjs',
    categorySlug: 'web-dev',
    respectCount: 601,
  },
  {
    id: 'p4',
    title: 'Postgres partial indexes we actually use',
    excerpt: 'Four patterns that paid off in production this quarter.',
    author: 'dba.dana',
    tagSlug: 'postgres',
    categorySlug: 'backend',
    respectCount: 267,
  },
  {
    id: 'p5',
    title: 'Flutter animations without the jank',
    excerpt: 'Repaint boundaries, Impeller, and one golden rule.',
    author: 'mobi.mara',
    tagSlug: 'swift',
    categorySlug: 'mobile',
    respectCount: 189,
  },
  {
    id: 'p6',
    title: 'Kubernetes namespaces for humans',
    excerpt: 'Naming, quotas, and how we onboard interns in a day.',
    author: 'sre.sam',
    tagSlug: 'kubernetes',
    categorySlug: 'devops',
    respectCount: 144,
  },
];

/** Mixed hero trail — squads, tags, and categories in rotation. */
export const DUMMY_TRAIL: ExploreTrailItem[] = [
  { kind: 'squad', squad: DUMMY_SQUADS[3]! },
  { kind: 'category', category: DUMMY_CATEGORIES[0]! },
  { kind: 'tag', tag: DUMMY_TAGS[9]! },
  { kind: 'squad', squad: DUMMY_SQUADS[1]! },
  { kind: 'tag', tag: DUMMY_TAGS[0]! },
  { kind: 'category', category: DUMMY_CATEGORIES[2]! },
  { kind: 'squad', squad: DUMMY_SQUADS[6]! },
  { kind: 'tag', tag: DUMMY_TAGS[4]! },
  { kind: 'category', category: DUMMY_CATEGORIES[4]! },
  { kind: 'tag', tag: DUMMY_TAGS[6]! },
  { kind: 'squad', squad: DUMMY_SQUADS[2]! },
];

export function tagsForTheme(theme: 'web' | 'mobile' | 'languages'): DummyTag[] {
  if (theme === 'web') {
    return DUMMY_TAGS.filter((t) =>
      ['typescript', 'react', 'nextjs', 'tailwind', 'graphql', 'css'].includes(t.slug),
    );
  }
  if (theme === 'mobile') {
    return DUMMY_TAGS.filter((t) => ['swift', 'react', 'graphql'].includes(t.slug));
  }
  return DUMMY_TAGS.filter((t) => ['rust', 'typescript', 'graphql', 'ai'].includes(t.slug));
}

export function postsForCategory(categorySlug: string): DummyPost[] {
  return DUMMY_POSTS.filter((p) => p.categorySlug === categorySlug).slice(0, 3);
}

export function postsForTag(tagSlug: string): DummyPost[] {
  return DUMMY_POSTS.filter((p) => p.tagSlug === tagSlug).slice(0, 2);
}
