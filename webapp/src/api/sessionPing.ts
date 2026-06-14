import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import { blogAuthFetch } from "@/lib/api/blogAuthFetch";
const base = () => resolvePublicApiBase();
export async function sessionPing(accessToken: string): Promise<{
  ok: boolean;
  userId?: string;
}> {
  const r = await blogAuthFetch(
    `${base()}/api/webhooks/session/ping`,
    { method: "GET" },
    accessToken,
  );
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    userId?: string;
    message?: string;
  };
  if (!r.ok) throw new Error(data.message ?? r.statusText);
  return { ok: data.ok === true, userId: data.userId };
}
