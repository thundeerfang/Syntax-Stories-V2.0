export const PUBLIC_API_FETCH_TIMEOUT_MS = 12000;
export function publicApiAbortSignal(): AbortSignal {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(PUBLIC_API_FETCH_TIMEOUT_MS);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), PUBLIC_API_FETCH_TIMEOUT_MS);
  return c.signal;
}
