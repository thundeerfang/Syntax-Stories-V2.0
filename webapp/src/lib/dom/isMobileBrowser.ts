export const MOBILE_BROWSER_LOCK_CLASS = "ss-mobile-browser-lock";

type NavigatorWithUaData = Navigator & {
  userAgentData?: { mobile?: boolean };
  standalone?: boolean;
};

const PHONE_MAX_SCREEN_EDGE_PX = 768;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithUaData).standalone === true
  );
}

function isDesktopPrimaryInput(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function hasTouchPhonePointerProfile(): boolean {
  if (typeof window === "undefined") return false;
  const hoverNone = window.matchMedia("(hover: none)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  return (
    navigator.maxTouchPoints > 0 &&
    hoverNone &&
    coarsePointer &&
    !isDesktopPrimaryInput()
  );
}

function isPhoneHardwareScreen(): boolean {
  if (typeof window === "undefined") return false;
  return window.screen.width < PHONE_MAX_SCREEN_EDGE_PX;
}

function isIPadLike(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return true;
  if (navigator.platform !== "MacIntel" || navigator.maxTouchPoints <= 1) {
    return false;
  }
  const minScreen = Math.min(window.screen.width, window.screen.height);
  return minScreen >= PHONE_MAX_SCREEN_EDGE_PX;
}

function isWindowsDesktop(ua: string): boolean {
  return /Windows NT|Win64|WOW64/i.test(ua) && !/Phone|IEMobile/i.test(ua);
}

function isMacDesktopUserAgent(ua: string): boolean {
  return /Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPod|iPad/i.test(ua);
}

function isLinuxDesktopUserAgent(ua: string): boolean {
  return /Linux x86_64|X11/i.test(ua) && !/Android/i.test(ua);
}

/** Real laptop/desktop machine — includes Chrome DevTools "Laptop 1024px" preview. */
function isDesktopBrowserEnvironment(ua: string): boolean {
  if (isWindowsDesktop(ua)) return true;
  if (/CrOS/i.test(ua)) return true;
  if (isMacDesktopUserAgent(ua) && window.screen.width >= PHONE_MAX_SCREEN_EDGE_PX) {
    return true;
  }
  return false;
}

function isIosDesktopSiteOnPhone(ua: string): boolean {
  return (
    isPhoneHardwareScreen() &&
    hasTouchPhonePointerProfile() &&
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1 &&
    isMacDesktopUserAgent(ua)
  );
}

function isAndroidDesktopSiteOnPhone(ua: string): boolean {
  if (!isPhoneHardwareScreen() || !hasTouchPhonePointerProfile()) return false;
  if (/Android/i.test(ua)) return true;
  return isLinuxDesktopUserAgent(ua);
}

/** True only for phones — default is desktop (unlocked). */
export function isPhoneLikeDevice(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const uaData = (navigator as NavigatorWithUaData).userAgentData;

  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  if (/webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;

  if (isIPadLike()) return false;

  if (isDesktopBrowserEnvironment(ua)) return false;

  if (uaData?.mobile === true) return true;
  if (uaData?.mobile === false) return false;
  if (isDesktopPrimaryInput()) return false;

  if (isIosDesktopSiteOnPhone(ua)) return true;
  if (isAndroidDesktopSiteOnPhone(ua)) return true;

  return false;
}

export function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneDisplay()) return false;
  return isPhoneLikeDevice();
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

  const queries = [
    window.matchMedia("(hover: none)"),
    window.matchMedia("(hover: hover)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(pointer: fine)"),
    window.matchMedia("(hover: hover) and (pointer: fine)"),
    window.matchMedia("(display-mode: standalone)"),
  ];
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
