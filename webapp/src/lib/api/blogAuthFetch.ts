import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import { useAuthStore } from "@/store/auth";
function apiBase(): string {
  return resolvePublicApiBase();
}
export class BlogApiConnectionError extends Error {
  constructor() {
    super("Cannot connect to the server.");
    this.name = "BlogApiConnectionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
export async function blogAuthFetch(
  url: string,
  init: RequestInit | undefined,
  accessToken: string,
): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (
    init?.body != null &&
    !baseHeaders["Content-Type"] &&
    !baseHeaders["content-type"]
  ) {
    baseHeaders["Content-Type"] = "application/json";
  }
  const run = async (token: string): Promise<Response> => {
    try {
      return await fetch(url, {
        ...init,
        headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new BlogApiConnectionError();
    }
  };
  let res = await run(accessToken);
  if (res.status === 401) {
    const newTok = await useAuthStore.getState().tryRefreshAndReturnNewToken();
    if (newTok) res = await run(newTok);
  }
  return res;
}
export async function blogPublicFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new BlogApiConnectionError();
  }
}
export { apiBase as getBlogApiBase };
