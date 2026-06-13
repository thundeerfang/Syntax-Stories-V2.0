/** Canonical admin user ref from a route param or href (handles single/double URI encoding). */
export function normalizeUserRef(input: string): string {
  let value = input.trim();
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(value)) break;
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

/** Encode ref once for management API path segments. */
export function userRefForApiPath(ref: string): string {
  return encodeURIComponent(normalizeUserRef(ref));
}
