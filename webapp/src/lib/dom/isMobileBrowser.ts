export const MOBILE_BROWSER_LOCK_CLASS = "ss-mobile-browser-lock";

type NavigatorWithUaData = Navigator & {
  userAgentData?: { mobile?: boolean };
  standalone?: boolean;
};

const MOBILE_LOCK_MAX_SCREEN_EDGE_PX = 768;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithUaData).standalone === true
  );
}

function isSmallScreen(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_LOCK_MAX_SCREEN_EDGE_PX;
}

function isDesktopUserAgent(ua: string): boolean {
  if (/Windows NT|Win64|WOW64/i.test(ua) && !/Phone|IEMobile/i.test(ua)) {
    return true;
  }
  if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPod|iPad/i.test(ua)) {
    return true;
  }
  if (/Linux x86_64|X11|CrOS/i.test(ua) && !/Android/i.test(ua)) {
    return true;
  }
  return false;
}

function hasMobileSignal(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const uaData = (navigator as NavigatorWithUaData).userAgentData;
  if (isDesktopUserAgent(ua) || uaData?.mobile === false) return false;
  if (uaData?.mobile === true) return true;
  if (/iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  return (
    navigator.maxTouchPoints > 0 &&
    window.matchMedia("(hover: none)").matches &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneDisplay()) return false;
  return isSmallScreen() && hasMobileSignal();
}

export function applyMobileBrowserLock(enabled: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (enabled) {
    root.classList.add(MOBILE_BROWSER_LOCK_CLASS);
    root.style.overflow = "hidden";
  } else {
    root.classList.remove(MOBILE_BROWSER_LOCK_CLASS);
    root.style.overflow = "";
  }
}

export function subscribeMobileBrowserLock(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const sync = () => onStoreChange();
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", sync);

  const queries = [window.matchMedia("(display-mode: standalone)")];
  for (const mq of queries) {
    mq.addEventListener("change", sync);
  }

  return () => {
    window.removeEventListener("resize", sync);
    window.removeEventListener("orientationchange", sync);
    for (const mq of queries) {
      mq.removeEventListener("change", sync);
    }
  };
}
