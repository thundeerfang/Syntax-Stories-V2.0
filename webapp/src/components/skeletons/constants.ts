export const PROFILE_CARD_SKELETON_KEYS = [
  "sk-a",
  "sk-b",
  "sk-c",
  "sk-d",
  "sk-e",
  "sk-f",
] as const;
export function profileCardSkeletonKeys(lines: number): readonly string[] {
  return PROFILE_CARD_SKELETON_KEYS.slice(
    0,
    Math.min(lines, PROFILE_CARD_SKELETON_KEYS.length),
  );
}
