function seedToBackgroundHex(seed: string): string {
  const s = seed.trim() || "user";
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  const sat = 42 + ((h >> 8) % 22);
  const light = 78 + ((h >> 16) % 14);
  const ss = sat / 100;
  const ll = light / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `${toHex((r + m) * 255)}${toHex((g + m) * 255)}${toHex((b + m) * 255)}`;
}

export type DiceBearStyle =
  | "avataaars"
  | "adventurer"
  | "initials"
  | "shapes";

export function diceBearAvatarUrl(
  seed: string,
  style: DiceBearStyle = "avataaars",
): string {
  const s = seed.trim() || "user";
  const params = new URLSearchParams({
    seed: s,
    backgroundColor: seedToBackgroundHex(s),
    backgroundType: "solid",
  });
  return `https://api.dicebear.com/7.x/${style}/svg?${params.toString()}`;
}

export function diceBearSquadIconUrl(slug: string): string {
  return diceBearAvatarUrl(slug.trim() || "squad", "shapes");
}

export function isDiceBearStoredProfile(raw: string | undefined): boolean {
  const t = raw?.trim() ?? "";
  if (!t) return false;
  if (t.startsWith("data:image/svg+xml")) return true;
  return t.includes("dicebear.com");
}
