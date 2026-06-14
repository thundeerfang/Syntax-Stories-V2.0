export function isDesktopBuild(): boolean {
  const flag = process.env.NEXT_PUBLIC_IS_DESKTOP;
  return flag === "1" || flag === "true";
}
export function isDesktopShell(): boolean {
  if (typeof window !== "undefined" && window.syntaxStoriesDesktop?.isDesktop) {
    return true;
  }
  return isDesktopBuild();
}
export function getDesktopPlatform(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.syntaxStoriesDesktop?.platform;
}
