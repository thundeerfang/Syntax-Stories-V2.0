/** Build-time flag when started via `npm run dev:desktop` (port 3010). */
export function isDesktopBuild(): boolean {
  const flag = process.env.NEXT_PUBLIC_IS_DESKTOP;
  return flag === '1' || flag === 'true';
}

/** True inside the Electron shell (preload bridge or build flag). */
export function isDesktopShell(): boolean {
  if (typeof window !== 'undefined' && window.syntaxStoriesDesktop?.isDesktop) {
    return true;
  }
  return isDesktopBuild();
}

export function getDesktopPlatform(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.syntaxStoriesDesktop?.platform;
}
