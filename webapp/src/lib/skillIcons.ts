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
  'nodejs': 'nodejs',
  'c++': 'cpp',
  'c#': 'cs',
  'vue.js': 'vue',
  'vue': 'vue',
  'next': 'nextjs',
  'next.js': 'nextjs',
  'tailwind': 'tailwind',
  'tailwindcss': 'tailwind',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
  'go': 'golang',
  'golang': 'golang',
  'k8s': 'kubernetes',
  'aws': 'aws',
  'gcp': 'gcp',
  'figma': 'figma',
  'git': 'git',
  'github': 'github',
  'gitlab': 'gitlab',
  'docker': 'docker',
  'mongodb': 'mongodb',
  'redis': 'redis',
  'html': 'html',
  'css': 'css',
  'react': 'react',
  'angular': 'angular',
  'python': 'python',
  'java': 'java',
  'rust': 'rust',
  'php': 'php',
  'ruby': 'ruby',
  'swift': 'swift',
  'kotlin': 'kotlin',
  'terraform': 'terraform',
  'linux': 'linux',
  'graphql': 'graphql',
  'prisma': 'prisma',
  'vite': 'vite',
  'express': 'express',
  'nestjs': 'nestjs',
  'jest': 'jest',
  'cypress': 'cypress',
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
 */
export function getSkillIconUrl(displayName: string): string {
  const slug = getSkillIconSlug(displayName);
  return slug ? `${SKILL_ICONS_BASE}${encodeURIComponent(slug)}` : '';
}

/**
 * Return the Skill Icons API URL from a known slug (e.g. from techStack list).
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
