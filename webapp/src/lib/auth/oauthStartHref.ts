import { isDesktopShell } from "@/lib/desktop/isDesktop";
import { DESKTOP_OAUTH_RETURN_ORIGIN } from "@/lib/desktop/desktopOAuthReturnOrigin";
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
function withDesktopReturnOrigin(href: string): string {
  if (typeof window === "undefined" || !isDesktopShell()) return href;
  const url = new URL(href);
  url.searchParams.set("frontendOrigin", DESKTOP_OAUTH_RETURN_ORIGIN);
  return url.toString();
}
export function withDesktopOAuthReturnOrigin(href: string): string {
  return withDesktopReturnOrigin(href);
}
export function oauthLoginHref(providerPath: string): string | undefined {
  if (!BACKEND_BASE) return undefined;
  const base = `${BACKEND_BASE.replace(/\/$/, "")}${providerPath}`;
  return withDesktopReturnOrigin(base);
}
export function oauthSignupHref(
  providerPath: string,
  referralCode?: string | null,
): string | undefined {
  if (!BACKEND_BASE) return undefined;
  let href = `${BACKEND_BASE.replace(/\/$/, "")}${providerPath}`;
  href = withDesktopReturnOrigin(href);
  let ref = referralCode?.trim() ?? "";
  if (!ref) {
    try {
      ref =
        globalThis.sessionStorage?.getItem("pendingReferralCode")?.trim() ?? "";
    } catch {
      ref = "";
    }
  }
  if (!ref) return href;
  const url = new URL(href);
  url.searchParams.set("ref", ref);
  return url.toString();
}
