/**
 * Skill Icons API: https://skillicons.dev/icons?i=react,nodejs,mongodb,docker
 * Converts display names (e.g. "React", "Node.js", "TypeScript") to skillicons slug format.
 */
const SKILL_ICONS_BASE = 'https://skillicons.dev/icons?i=';

/** Map common display names to skillicons.dev slug (lowercase, no spaces/dots) */
const SLUG_OVERRIDES: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  'node.js': 'nodejs',
  nodejs: 'nodejs',
  'c++': 'cpp',
  'c#': 'cs',
  'vue.js': 'vue',
  vue: 'vue',
  next: 'nextjs',
  'next.js': 'nextjs',
  tailwind: 'tailwind',
  tailwindcss: 'tailwind',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  go: 'golang',
  golang: 'golang',
  k8s: 'kubernetes',
  aws: 'aws',
  gcp: 'gcp',
  figma: 'figma',
  git: 'git',
  github: 'github',
  gitlab: 'gitlab',
  docker: 'docker',
  mongodb: 'mongodb',
  redis: 'redis',
  html: 'html',
  css: 'css',
  react: 'react',
  angular: 'angular',
  python: 'python',
  java: 'java',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
  swift: 'swift',
  kotlin: 'kotlin',
  terraform: 'terraform',
  linux: 'linux',
  graphql: 'graphql',
  prisma: 'prisma',
  vite: 'vite',
  express: 'express',
  nestjs: 'nestjs',
  jest: 'jest',
  cypress: 'cypress',
};

/**
 * Normalize a display name (e.g. "React", "Node.js") to skillicons slug.
 * Uses overrides first, then lowercase + remove spaces and dots.
 */
export function getSkillIconSlug(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const noSpaces = lower.replaceAll(/\s+/g, '');
  const noDots = noSpaces.replaceAll('.', '');
  return SLUG_OVERRIDES[noDots] ?? SLUG_OVERRIDES[lower] ?? SLUG_OVERRIDES[noSpaces] ?? noDots;
}

/**
 * Return the Skill Icons API URL for a single tech (e.g. "React" → "https://skillicons.dev/icons?i=react").
 * @deprecated Prefer `iconUrl` from `/api/reference/tech-stack` search or resolve.
 */
export function getSkillIconUrl(displayName: string): string {
  const slug = getSkillIconSlug(displayName);
  return slug ? `${SKILL_ICONS_BASE}${encodeURIComponent(slug)}` : '';
}

/**
 * Return the Skill Icons API URL from a known slug (e.g. from techStack list).
 * @deprecated Prefer `iconUrl` from `/api/reference/tech-stack` search or resolve.
 */
export function getSkillIconUrlBySlug(slug: string): string {
  const s = slug?.trim();
  return s ? `${SKILL_ICONS_BASE}${encodeURIComponent(s)}` : '';
}

/**
 * Return the Skill Icons API URL for multiple techs (single image with all icons).
 * e.g. ["React", "Node.js", "MongoDB"] → "https://skillicons.dev/icons?i=react,nodejs,mongodb"
 */
export function getSkillIconsCombinedUrl(displayNames: string[]): string {
  const slugs = displayNames.map(getSkillIconSlug).filter(Boolean);
  return slugs.length ? `${SKILL_ICONS_BASE}${slugs.map(encodeURIComponent).join(',')}` : '';
}

/** Warm the browser cache for stack badge icons from API rows. */
export function preloadTechStackItems(
  items: ReadonlyArray<{ name: string; iconUrl?: string; iconSlug?: string }>
): void {
  if (typeof window === 'undefined' || items.length === 0) return;

  const slugs = items
    .map((item) => {
      const fromSlug = item.iconSlug?.trim();
      if (fromSlug) return fromSlug;
      return getSkillIconSlug(item.name);
    })
    .filter(Boolean);

  const combined = slugs.length
    ? `${SKILL_ICONS_BASE}${slugs.map(encodeURIComponent).join(',')}`
    : '';
  if (combined) {
    const batch = new window.Image();
    batch.decoding = 'async';
    batch.src = combined;
  }

  for (const item of items) {
    const url = resolveTechStackIconSrc(item);
    if (!url) continue;
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
  }
}

/** Best icon URL for a catalog row — instant client fallback when API row is present. */
export function resolveTechStackIconSrc(
  item: Readonly<{ name: string; iconUrl?: string; iconSlug?: string }>
): string {
  const fromApi = item.iconUrl?.trim();
  if (fromApi) return fromApi;
  const slug = item.iconSlug?.trim() || getSkillIconSlug(item.name);
  return slug ? getSkillIconUrlBySlug(slug) : getSkillIconUrl(item.name);
}

/**
 * @deprecated Prefer `iconUrl` from `/api/reference/tech-stack` search or resolve.
 * Warm the browser cache for stack badge icons (combined + per-item).
 */
export function preloadSkillIcons(displayNames: string[]): void {
  if (typeof window === 'undefined' || displayNames.length === 0) return;

  const combined = getSkillIconsCombinedUrl(displayNames);
  if (combined) {
    const batch = new window.Image();
    batch.decoding = 'async';
    batch.src = combined;
  }

  for (const name of displayNames) {
    const url = getSkillIconUrl(name);
    if (!url) continue;
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
  }
}
