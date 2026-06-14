const SKILL_ICONS_BASE = "https://skillicons.dev/icons?i=";
const SLUG_OVERRIDES: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  "node.js": "nodejs",
  nodejs: "nodejs",
  "c++": "cpp",
  "c#": "cs",
  "vue.js": "vue",
  vue: "vue",
  next: "nextjs",
  "next.js": "nextjs",
  tailwind: "tailwind",
  tailwindcss: "tailwind",
  postgres: "postgresql",
  postgresql: "postgresql",
  go: "golang",
  golang: "golang",
  k8s: "kubernetes",
  aws: "aws",
  gcp: "gcp",
  figma: "figma",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  docker: "docker",
  mongodb: "mongodb",
  redis: "redis",
  html: "html",
  css: "css",
  react: "react",
  angular: "angular",
  python: "python",
  java: "java",
  rust: "rust",
  php: "php",
  ruby: "ruby",
  swift: "swift",
  kotlin: "kotlin",
  terraform: "terraform",
  linux: "linux",
  graphql: "graphql",
  prisma: "prisma",
  vite: "vite",
  express: "express",
  nestjs: "nestjs",
  jest: "jest",
  cypress: "cypress",
};
export function getSkillIconSlug(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const noSpaces = lower.replaceAll(/\s+/g, "");
  const noDots = noSpaces.replaceAll(".", "");
  return (
    SLUG_OVERRIDES[noDots] ??
    SLUG_OVERRIDES[lower] ??
    SLUG_OVERRIDES[noSpaces] ??
    noDots
  );
}
export function getSkillIconUrl(displayName: string): string {
  const slug = getSkillIconSlug(displayName);
  return slug ? `${SKILL_ICONS_BASE}${encodeURIComponent(slug)}` : "";
}
export function getSkillIconUrlBySlug(slug: string): string {
  const s = slug?.trim();
  return s ? `${SKILL_ICONS_BASE}${encodeURIComponent(s)}` : "";
}
export function getSkillIconsCombinedUrl(displayNames: string[]): string {
  const slugs = displayNames.map(getSkillIconSlug).filter(Boolean);
  return slugs.length
    ? `${SKILL_ICONS_BASE}${slugs.map(encodeURIComponent).join(",")}`
    : "";
}
export function preloadTechStackItems(
  items: ReadonlyArray<{
    name: string;
    iconUrl?: string;
    iconSlug?: string;
  }>,
): void {
  if (typeof window === "undefined" || items.length === 0) return;
  const slugs = items
    .map((item) => {
      const fromSlug = item.iconSlug?.trim();
      if (fromSlug) return fromSlug;
      return getSkillIconSlug(item.name);
    })
    .filter(Boolean);
  const combined = slugs.length
    ? `${SKILL_ICONS_BASE}${slugs.map(encodeURIComponent).join(",")}`
    : "";
  if (combined) {
    const batch = new window.Image();
    batch.decoding = "async";
    batch.src = combined;
  }
  for (const item of items) {
    const url = resolveTechStackIconSrc(item);
    if (!url) continue;
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
  }
}
export function resolveTechStackIconSrc(
  item: Readonly<{
    name: string;
    iconUrl?: string;
    iconSlug?: string;
  }>,
): string {
  const fromApi = item.iconUrl?.trim();
  if (fromApi) return fromApi;
  const slug = item.iconSlug?.trim() || getSkillIconSlug(item.name);
  return slug ? getSkillIconUrlBySlug(slug) : getSkillIconUrl(item.name);
}
export function preloadSkillIcons(displayNames: string[]): void {
  if (typeof window === "undefined" || displayNames.length === 0) return;
  const combined = getSkillIconsCombinedUrl(displayNames);
  if (combined) {
    const batch = new window.Image();
    batch.decoding = "async";
    batch.src = combined;
  }
  for (const name of displayNames) {
    const url = getSkillIconUrl(name);
    if (!url) continue;
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
  }
}
