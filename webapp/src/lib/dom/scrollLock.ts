let lockCount = 0;
let savedScrollY = 0;
function applyLock(): void {
  if (typeof document === "undefined") return;
  savedScrollY = window.scrollY;
  const { documentElement: html, body } = document;
  html.classList.add("ss-scroll-locked");
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
  html.style.overflow = "hidden";
}
function releaseLock(): void {
  if (typeof document === "undefined") return;
  const { documentElement: html, body } = document;
  html.classList.remove("ss-scroll-locked");
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.style.overflow = "";
  html.style.overflow = "";
  window.scrollTo(0, savedScrollY);
}
export function acquireScrollLock(): () => void {
  lockCount += 1;
  if (lockCount === 1) applyLock();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) releaseLock();
  };
}
