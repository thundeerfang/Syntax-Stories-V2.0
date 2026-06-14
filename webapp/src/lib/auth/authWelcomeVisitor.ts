const SEEN_FINGERPRINT_KEY = "syntax-stories-auth-welcome-fp";
export type AuthWelcomeTitle = "Welcome." | "Welcome back.";
function collectBrowserSignals(): string {
  if (globalThis.window === undefined) return "";
  const nav = globalThis.navigator;
  const screen = globalThis.screen;
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    timezone = "";
  }
  return [
    nav.userAgent,
    nav.language,
    nav.languages?.join(",") ?? "",
    nav.platform ?? "",
    String(nav.hardwareConcurrency ?? ""),
    String(screen?.width ?? ""),
    String(screen?.height ?? ""),
    String(screen?.colorDepth ?? ""),
    timezone,
    String(nav.maxTouchPoints ?? ""),
  ].join("\u0001");
}
function hashSignals(raw: string): string {
  let h = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    h = (h * 33) ^ raw.charCodeAt(i);
  }
  return `v1-${(h >>> 0).toString(36)}`;
}
export function resolveAuthWelcomeTitle(): AuthWelcomeTitle {
  if (globalThis.window === undefined) return "Welcome.";
  try {
    const fingerprint = hashSignals(collectBrowserSignals());
    const seen = globalThis.localStorage.getItem(SEEN_FINGERPRINT_KEY);
    if (seen === fingerprint) return "Welcome back.";
    globalThis.localStorage.setItem(SEEN_FINGERPRINT_KEY, fingerprint);
    return "Welcome.";
  } catch {
    return "Welcome.";
  }
}
