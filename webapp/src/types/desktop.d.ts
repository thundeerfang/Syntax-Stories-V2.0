interface SyntaxStoriesDesktopBridge {
  platform: NodeJS.Platform;
  isDesktop: boolean;
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => void;
}

interface Window {
  syntaxStoriesDesktop?: SyntaxStoriesDesktopBridge;
}
