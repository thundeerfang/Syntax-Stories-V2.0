/**
 * Skill Icons CDN — https://skillicons.dev
 * Single source of truth for webapp + mobile (clients consume iconUrl from API).
 */
export const SKILL_ICONS_BASE = 'https://skillicons.dev/icons?i=';

/** Map display/catalog slugs to skillicons.dev slugs. */
export const SKILL_ICON_SLUG_OVERRIDES: Record<string, string> = {
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
  svelte: 'svelte',
  flutter: 'flutter',
  dart: 'dart',
  firebase: 'firebase',
  supabase: 'supabase',
  vercel: 'vercel',
  netlify: 'netlify',
  bun: 'bun',
  deno: 'deno',
  mysql: 'mysql',
  sqlite: 'sqlite',
  elasticsearch: 'elasticsearch',
  rabbitmq: 'rabbitmq',
  kafka: 'kafka',
  jenkins: 'jenkins',
  ansible: 'ansible',
  bash: 'bash',
  npm: 'npm',
  yarn: 'yarn',
  pnpm: 'pnpm',
  webpack: 'webpack',
  rollup: 'rollup',
  redux: 'redux',
  mobx: 'mobx',
  sass: 'sass',
  less: 'less',
  bootstrap: 'bootstrap',
  materialui: 'materialui',
  'material-ui': 'materialui',
  mui: 'materialui',
  threejs: 'threejs',
  'three.js': 'threejs',
  electron: 'electron',
  tauri: 'tauri',
  xcode: 'xcode',
  androidstudio: 'androidstudio',
  postman: 'postman',
  insomnia: 'insomnia',
  vscode: 'vscode',
  vim: 'vim',
  neovim: 'neovim',
  emacs: 'emacs',
  azure: 'azure',
  digitalocean: 'digitalocean',
  heroku: 'heroku',
  cloudflare: 'cloudflare',
  nginx: 'nginx',
  apache: 'apache',
  spring: 'spring',
  django: 'django',
  flask: 'flask',
  fastapi: 'fastapi',
  laravel: 'laravel',
  rails: 'rails',
  dotnet: 'dotnet',
  '.net': 'dotnet',
  unity: 'unity',
  unreal: 'unreal',
  blender: 'blender',
  sketch: 'sketch',
  adobexd: 'adobexd',
  xd: 'adobexd',
  photoshop: 'photoshop',
  illustrator: 'illustrator',
};

/** Normalize a display name or slug to a skillicons.dev slug. */
export function resolveIconSlug(displayNameOrSlug: string): string {
  const trimmed = displayNameOrSlug.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const noSpaces = lower.replace(/\s+/g, '');
  const noDots = noSpaces.replace(/\./g, '');
  return (
    SKILL_ICON_SLUG_OVERRIDES[noDots] ??
    SKILL_ICON_SLUG_OVERRIDES[lower] ??
    SKILL_ICON_SLUG_OVERRIDES[noSpaces] ??
    noDots
  );
}

/** Build a ready-to-use icon URL for clients. */
export function buildIconUrl(iconSlug: string): string {
  const slug = iconSlug.trim();
  return slug ? `${SKILL_ICONS_BASE}${encodeURIComponent(slug)}` : '';
}

/** Catalog slug from a free-form display name (custom skills). */
export function normalizeCatalogSlug(displayName: string): string {
  const base = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, 64);
}
