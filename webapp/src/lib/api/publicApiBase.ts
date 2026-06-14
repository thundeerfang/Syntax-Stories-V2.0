export function resolvePublicApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (env !== undefined && env !== null) {
    return env.replace(/\/$/, "");
  }
  if (globalThis.window === undefined) {
    return "";
  }
  return globalThis.window.location.origin.replace(/\/$/, "");
}
export function resolveFetchBaseForApiClient(): string {
  if (globalThis.window === undefined) {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  }
  return "";
}
export function resolveSameOriginRequestUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  if (globalThis.window === undefined) {
    return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}${path}`;
  }
  return `${globalThis.window.location.origin}${path}`;
}
