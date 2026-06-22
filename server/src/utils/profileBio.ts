export const DEFAULT_PROFILE_BIO = "Hey There Welcome To Syntax Stories";
const PLACEHOLDER_PROFILE_BIOS = new Set([
  DEFAULT_PROFILE_BIO,
  "Welcome to Syntax Stories 🧑🏻‍💻, you can add your bio you want..🚀",
  "Welcome to Syntax Stories 🧑🏻‍💻",
]);
export function isPlaceholderProfileBio(bio: unknown): boolean {
  if (typeof bio !== "string") return true;
  const t = bio.trim();
  return t.length === 0 || PLACEHOLDER_PROFILE_BIOS.has(t);
}
export function normalizeProfileBio(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (isPlaceholderProfileBio(raw)) return undefined;
  return raw;
}
